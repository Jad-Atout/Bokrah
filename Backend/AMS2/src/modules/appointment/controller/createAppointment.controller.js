import mongoose from "mongoose";
import {AppError} from "../../../utils/AppError.js";

import appointmentModel from "../../../../DB/models/appointment.js";
import staffModel from "../../../../DB/models/staff.js";
import customerModel from "../../../../DB/models/customer.js";
import customerClientModel from "../../../../DB/models/ClientCustomer.js";

import {transCreateCustomer} from "../../../../DB/Controller/customer.DB.controller.js";
import createEvent from "../../../utils/Google/events/createEvent.js";
import {scheduleReminders} from "../../../utils/Scheduler/reminderSchedules.js";
import {sendAppointmentBookedNotifications} from "./utils/notificationSenders.js";
import {
    calculateEndTime,
    generateRecurringDates,
    eventCreateRollback
} from "./utils/helpers.js";
import {validateMultipleServices} from "../../bookingSettings/utils/bookingSettingsUtils.js";

import {ticks} from "../../../utils/ticks.js";          // minute-tick helper
import BusySlot from "../../../../DB/models/busySlot.js";       // lock model
import {checkAvailability} from "../../../utils/Google/Services/checkAvailability.js";
import {sendEmail} from "../../../utils/email.js";
import {appointmentConfirmationEmail, appointmentFullDetailsEmail} from "../../../utils/emailTemplete.js";

export const createAppointment = async (req, res, next) => {
    console.time("Total createAppointment");

    let {customerId, recurrence, slot, userId, notes, emailReminder} = req.body;
    const {clientId} = req.params;
    const authClient = req.oauth2Client;
    const APPOINTMENT_STATUS = "Booked";

    const session = await mongoose.startSession();
    session.startTransaction();

    const createdAppointments = [];
    let notificationServices = [];
    try {
        console.time("Find customer");
        const customer = await customerModel.findById(customerId).populate("userId");
        console.timeEnd("Find customer");

        if (!customer?.userId) throw new AppError("Customer not found", 404);
        if (customer.userId.authProvider === "local" && !customer.userId.confirmed) {
            throw new AppError("Customer must be confirmed", 401);
        }

        const appointmentDates = generateRecurringDates(slot.startTime, recurrence);

        for (const appointmentStart of appointmentDates) {
            const subAppointments = [];
            const busySlotStubs = [];

            let mainAppointmentStart = new Date(appointmentStart);
            let mainAppointmentEnd = new Date(slot.endTime);
            console.time("Check customer overlap");
            const overlap = await appointmentModel.findOne({
                customerId,
                status: "Booked",
                $or: [{
                    "subAppointments.startTime": {$lt: mainAppointmentEnd},
                    "subAppointments.endTime": {$gt: mainAppointmentStart}
                }]
            }).session(session);
            console.timeEnd("Check customer overlap");

            if (overlap) throw new AppError("customer already have an appointment in that slot.", 400);

            const {staffServices, startTime, endTime} = slot.subSlots[0];

            let adjustedStartTime = new Date(appointmentStart);
            adjustedStartTime.setHours(
                new Date(startTime).getHours(),
                new Date(startTime).getMinutes(), 0, 0);

            const adjustedEndTime = new Date(appointmentStart);
            adjustedEndTime.setHours(
                new Date(endTime).getHours(),
                new Date(endTime).getMinutes(), 0, 0);
            const eventPromises = [];
            for (const {staffId, services} of staffServices) {
                console.time(`validateServices-${staffId}`);
                await validateMultipleServices(clientId, services);
                console.timeEnd(`validateServices-${staffId}`);

                notificationServices = services;

                console.time(`staffLookup-${staffId}`);
                const staffData = await staffModel.findById(staffId)
                    .populate({path: "userId", ref: "User", select: "userName email"})
                    .session(session);
                console.timeEnd(`staffLookup-${staffId}`);

                const endTimeCalculated = new Date(calculateEndTime(adjustedStartTime, services));

                if (adjustedEndTime < endTimeCalculated) {
                    throw new AppError("Slot too short for services", 400);
                }

                try {
                    const busyTicks = ticks(staffId, adjustedStartTime, endTimeCalculated, 1).slice(0, -1);
                    const busyDocs = busyTicks.map(({staffId, slotStart}) => ({
                        clientId,
                        staffId,
                        slotStart,
                        expiresAt: new Date(Date.now() + 60_000),
                    }));
                    console.time(`insertBusy-${staffId}`);
                    await BusySlot.insertMany(busyDocs, {session});
                    console.timeEnd(`insertBusy-${staffId}`);
                    busySlotStubs.push(...busyDocs);
                } catch (err) {
                    console.error(err);
                    if (err.code === 11000) {
                        throw new AppError(`Slot already booked: staff ${staffData.userId.userName} unavailable at ${adjustedStartTime.toISOString()}`, 409);
                    }
                    throw err;
                }

                console.time(`checkGoogleFreeBusy-${staffId}`);
                const free = await checkAvailability(authClient, staffId, adjustedStartTime, endTimeCalculated);
                console.timeEnd(`checkGoogleFreeBusy-${staffId}`);
                if (!free) {
                    throw new AppError(`Staff ${staffData.userId.userName} unavailable externally at ${adjustedStartTime}`, 400);
                }


                subAppointments.push({
                    staffId,
                    services,
                    startTime: adjustedStartTime,
                    endTime: endTimeCalculated
                });

                adjustedStartTime = endTimeCalculated;
            }

            console.time("Save appointment");
            const appointment = new appointmentModel({
                clientId,
                customerId,
                emailReminder,
                status: APPOINTMENT_STATUS,
                notes,
                subAppointments,
                recurrence
            });
            await appointment.save({session});
            console.timeEnd("Save appointment");

            createdAppointments.push(appointment);
        }


        console.time("Commit transaction");
        await session.commitTransaction();
        session.endSession();
        console.timeEnd("Commit transaction");

        console.time("Schedule reminders + notifications");
        for (const appt of createdAppointments) {
            if (appt.emailReminder) scheduleReminders(appt._id);
        }
        sendAppointmentBookedNotifications({
            appointments: createdAppointments,
            customer,
            clientId,
            notificationServices,
            authUser: req.authUser
        });
        if (customer.userId.email) {
            appointmentConfirmationEmail(createdAppointments[0]._id)
                .then(html => sendEmail(customer.userId.email, "Appointment Booked", html));
            appointmentFullDetailsEmail(createdAppointments[0]._id)
                .then(html => sendEmail(customer.userId.email, "Appointment Booked", html));
        }
        console.timeEnd("Schedule reminders + notifications");

        console.timeEnd("Total createAppointment");

        res.status(201).json({
            message: "Appointments created successfully",
            appointments: createdAppointments
        });

        // ✅ Background calendar sync
        setImmediate(() => {
            linkCustomer(customerId,clientId)
            for (const appointment of createdAppointments) {
                syncAppointmentWithCalendar({appointment, customer, authClient, req})
                    .catch(console.error);
            }
        });

    } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        session.endSession();
        await eventCreateRollback([], authClient);
        console.error("Error in createAppointment:", error);
        return next(new AppError(`Failed to create appointment(s): ${error.message}`, 500));
    }
};


async function linkCustomer(customerId,clientId){
    await customerClientModel.updateOne(
        {customerId, clientId},
        {$setOnInsert: {customerId, clientId}},
        {upsert: true}
    );
}


async function syncAppointmentWithCalendar({appointment, customer, authClient, req}) {
    const appointmentId = appointment._id;

    for (const sub of appointment.subAppointments) {
        const staff = await staffModel.findById(sub.staffId).populate({
            path: "userId",
            select: "userName email"
        });

        const event = await createEvent(req, authClient, {
            summary: `Appointment with ${customer.userId.userName} and ${staff.userId.userName}`,
            description: sub.services.map(s => s.serviceName).join(", "),
            customerName: customer.userId.userName,
            staffName: staff.userId.userName,
            serviceNames: sub.services.map(s => s.serviceName),
            startTime: sub.startTime,
            endTime: sub.endTime,
            calendarId: staff.calendarId,
            attendees: [{email: customer.userId.email}],
            sendUpdates: "all"
        });

        await appointmentModel.updateOne(
            {_id: appointmentId, "subAppointments.startTime": sub.startTime},
            {
                $set: {
                    "subAppointments.$.eventId": event.id,
                    "subAppointments.$.calendarId": staff.calendarId
                }
            }
        );
    }
}
