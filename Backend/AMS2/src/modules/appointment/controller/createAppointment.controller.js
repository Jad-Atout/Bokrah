import mongoose from "mongoose";
import { AppError } from "../../../utils/AppError.js";

import appointmentModel from "../../../../DB/models/appointment.js";
import staffModel from "../../../../DB/models/staff.js";
import customerModel from "../../../../DB/models/customer.js";
import customerClientModel from "../../../../DB/models/ClientCustomer.js";

import { transCreateCustomer } from "../../../../DB/Controller/customer.DB.controller.js";
import createEvent from "../../../utils/Google/events/createEvent.js";
import { scheduleReminders } from "../../../utils/Scheduler/reminderSchedules.js";
import { sendAppointmentBookedNotifications } from "./utils/notificationSenders.js";
import {
    calculateEndTime,
    generateRecurringDates,
    eventCreateRollback
} from "./utils/helpers.js";
import { validateMultipleServices } from "../../bookingSettings/utils/bookingSettingsUtils.js";

import { ticks } from "../../../utils/ticks.js";          // minute-tick helper
import BusySlot from "../../../../DB/models/busySlot.js";       // lock model
import { checkAvailability } from "../../../utils/Google/Services/checkAvailability.js";
import {sendEmail} from "../../../utils/email.js";
import {appointmentConfirmationEmail, appointmentFullDetailsEmail} from "../../../utils/emailTemplete.js";

export const createAppointment = async (req, res, next) => {
    let { customerId, recurrence, slot, userId, notes, emailReminder } = req.body;
    const { clientId } = req.params;
    const authClient   = req.oauth2Client;
    const APPOINTMENT_STATUS = "Booked";

    const session = await mongoose.startSession();
    session.startTransaction();

    const createdEvents       = [];
    const createdAppointments = [];
    let   notificationServices = [];
    try {

        if (!customerId && userId) {
            const found = await customerModel.findOne({ userId });
            customerId  = found ? found._id
                : (await transCreateCustomer({ userId })).customer;
        }

        const customer = await customerModel.findById(customerId).populate("userId");
        if (!customer?.userId)              throw new AppError("Customer not found", 404);
        if (customer.userId.authProvider === "local" && !customer.userId.confirmed) {
            throw new AppError("Customer must be confirmed", 401);
        }

        const appointmentDates = generateRecurringDates(slot.startTime, recurrence);
        for (const appointmentStart of appointmentDates) {

            const subAppointments = [];
            const busySlotStubs   = [];

            let mainAppointmentStart = new Date(appointmentStart);
            let mainAppointmentEnd   = new Date(slot.endTime);   // same, just date-wrapped
            const overlap   = await appointmentModel.findOne({
                customerId,
                status: "Booked",
                $or: [
                    { "subAppointments.startTime": { $lt: mainAppointmentEnd },
                        "subAppointments.endTime":   { $gt: mainAppointmentStart } }
                ]
            }).session(session);


            if (overlap) throw new AppError("customer already have an appointment in that slot.", 400);
            const { staffServices, startTime, endTime } = slot.subSlots[0];
            let adjustedStartTime = new Date(appointmentStart);
            adjustedStartTime.setHours(
                    new Date(startTime).getHours(),
                    new Date(startTime).getMinutes(),
                    0, 0);

                const adjustedEndTime = new Date(appointmentStart);
                adjustedEndTime.setHours(
                    new Date(endTime).getHours(),
                    new Date(endTime).getMinutes(),
                    0, 0);

                if (adjustedStartTime >= adjustedEndTime) {
                    throw new AppError("End time must be later than start time", 400);
                }
                /* -- 3.c staffService loop (Google / event kept) -- */
                for (const { staffId, services } of staffServices) {
                    await validateMultipleServices(clientId, services);
                    notificationServices = services;

                    /* staffData lookup stays here */
                    const staffData = await staffModel.findById(staffId)
                        .populate({ path: "userId", ref: "User", select: "userName email" })
                        .session(session);

                    const endTimeCalculated = new Date(calculateEndTime(adjustedStartTime, services))

                    if (adjustedEndTime < endTimeCalculated) {
                        throw new AppError("Slot too short for services", 400);
                    }


                    try {
                        let busyTicks = ticks(staffId, adjustedStartTime, endTimeCalculated, 1)
                        busyTicks = busyTicks.slice(0, -1);
                        const busyDocs = busyTicks.map(({ staffId, slotStart }) => ({
                            clientId,
                            staffId,
                            slotStart,
                            expiresAt: new Date(Date.now() + 60_000),
                        }));

                        await BusySlot.insertMany(busyDocs, { session });
                        busySlotStubs.push(...busyDocs);
                    } catch (err) {
                        console.error(err)
                        if (err.code === 11000) {
                            throw new AppError(`Slot already booked: staff ${staffData.userId.userName} unavailable at ${adjustedStartTime.toISOString()}`, 409);
                        }
                        throw err;
                    }


                    /* ---- 3.C.2 Google Free/busy (unchanged) ---- */
                    const free = await checkAvailability(authClient, staffId,
                        adjustedStartTime, endTimeCalculated);
                    if (!free) {
                        throw new AppError(
                            `Staff ${staffData.userId.userName} unavailable externally at ${adjustedStartTime}`,
                            400);
                    }

                    /* ---- 3.C.3 Create Google event (unchanged) ---- */
                    const event = await createEvent(req, authClient, {
                        summary:       `Appointment with ${customer.userId.userName} and ${staffData.userId.userName}`,
                        description:   services.map(s => s.serviceName).join(", "),
                        customerName:  customer.userId.userName,
                        staffName:     staffData.userId.userName,
                        serviceNames:  services.map(s => s.serviceName),
                        startTime:     adjustedStartTime,
                        endTime:       endTimeCalculated,
                        calendarId:    staffData.calendarId,
                        attendees:     [{ email: customer.userId.email }],
                        sendUpdates:   "all",
                    });
                    createdEvents.push({ eventId: event.id, calendarId: staffData.calendarId });

                    subAppointments.push({
                        staffId,
                        services,
                        startTime: adjustedStartTime,
                        endTime:   endTimeCalculated,
                        eventId:   event.id
                    });
                    adjustedStartTime = endTimeCalculated
                }


            /* ---------- 3.d save Appointment ONCE per date ---------- */
            const appointment = new appointmentModel({
                clientId,
                customerId,
                emailReminder,
                status: APPOINTMENT_STATUS,
                notes,
                subAppointments,
                recurrence
            });
            await appointment.save({ session });
            createdAppointments.push(appointment);

        } // end date loop

        /* ---------- 4. customer-client link (unchanged) ---------- */
        if (!await customerClientModel.findOne({ customerId, clientId })) {
            await new customerClientModel({ customerId, clientId }).save({ session });
        }

        /* ---------- 5. commit & cleanup -------------------------- */
        await session.commitTransaction();
        session.endSession();

        // fire-and-forget delete (TTL is backup)
        setTimeout(() => {
            BusySlot.deleteMany({
                appointmentId: { $in: createdAppointments.map(a => a._id) }
            });
        }, 1_000);

        /* ---------- 6. reminders + notifications (unchanged) ----- */
        for (const appt of createdAppointments) {
            if (appt.emailReminder) await scheduleReminders(appt._id);
        }
        await sendAppointmentBookedNotifications({
            appointments: createdAppointments,
            customer,
            clientId,
            notificationServices,
            authUser: req.authUser
        });
        if(customer.userId.email){
            await sendEmail(customer.userId.email,"Appointment Booked", await appointmentConfirmationEmail(
                createdAppointments[0]._id
            ))
            await sendEmail(customer.userId.email,"Appointment Booked", await appointmentFullDetailsEmail(
                createdAppointments[0]._id
            ))
        }
        return res.status(201).json({
            message: "Appointments and calendar events created successfully",
            appointments: createdAppointments
        });

    } catch (error) {
        /* duplicate minute = slot already taken */
        if (error.code === 112) {
            if (session.inTransaction()) await session.abortTransaction();
            session.endSession();
            await eventCreateRollback(createdEvents, authClient);
            return next(new AppError(
                "Selected time has just been taken. Please pick another slot.",
                409));
        }
        if (session.inTransaction()) await session.abortTransaction();
        session.endSession();
        await eventCreateRollback(createdEvents, authClient);
        console.error("Error in createAppointment:", error);
        return next(new AppError(`Failed to create appointment(s): ${error.message}`, 500));
    }
};
