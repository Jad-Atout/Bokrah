import { checkAvailability } from "../../../utils/Google/Services/checkAvailability.js";
import { AppError } from "../../../utils/AppError.js";
import mongoose from "mongoose";
import appointmentModel from "../../../../DB/models/appointment.js";
import createEvent from "../../../utils/Google/events/createEvent.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import staffModel from "../../../../DB/models/staff.js";
import customerModel from "../../../../DB/models/customer.js";
import customerClientModel from "../../../../DB/models/ClientCustomer.js";
import {
    calculateEndTime,
    checkInternalAvailability,
    generateRecurringDates,
    eventCreateRollback
} from "./helpers.js";
import { sendEmail } from "../../../utils/email.js";
import { appointmentConfirmationEmail } from "../../../utils/emailTemplete.js";
import reminderModel from "../../../../DB/models/reminder.js";
import { scheduleReminders } from "../../../utils/scheduler.js";
import {transCreateCustomer} from "../../../../DB/Controller/customer.DB.controller.js";
//TODO fix integrity handling
//TODO share the staff calendar with the staff
//TODO send email to the customer and staff
//TODO the local customer must be confirmed





export const createAppointment = async (req, res, next) => {
    let { customerId, recurrence, slot,userId } = req.body;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;
    const SS = req.staffsServices;
    const APPOINTMENT_STATUS = "Booked";
    const session = await mongoose.startSession();
    session.startTransaction();
    let createdEvents = [];
    let createdAppointments = [];
//TODO search by userId for customer
    if(!customerId && userId) {
        const {customer: cust} = await transCreateCustomer({userId})
        customerId = cust._id
    }

    const customer = await customerModel.findById(customerId)
        .populate([{ path: "userId", ref: "User", select: "userName email" }])
        .select("userName email userId");


    if (!customer?.userId) {
        return next(new AppError("Customer not found", 404));
    }

    try {

        const reminderSettings = await reminderModel.findOne({ clientId });
        const defaultReminders =
            reminderSettings?.reminderTimes?.map((time, index) => ({
                method:
                    reminderSettings.reminderMethods?.[index % reminderSettings.reminderMethods.length] || "email",
                minutes: Number.isFinite(time) ? time : 60,
            })) || [{ method: "email", minutes: 60 }];

        const appointmentDates = generateRecurringDates(slot[0].startTime, recurrence);
        for (const appointmentStart of appointmentDates) {
            let subAppointments = [];
            let currentStartTime = new Date(appointmentStart);

            for (const slotItem of slot) {
                const { subSlots } = slotItem;

                for (const subSlot of subSlots) {
                    let { staffServices, startTime, endTime } = subSlot;

                    if (startTime >= endTime) {
                        throw new AppError("End time must be later than start time", 400);
                    }

                    for (const staffService of staffServices) {
                        const { staffId, services } = staffService;

                        const staffData = await staffModel.findById(staffId)
                            .populate([{ path: "userId", ref: "User", select: "userName email" }])
                            .session(session);

                        const endTimeCalculated = calculateEndTime(startTime, services);
                        if(endTime!==endTimeCalculated) throw new AppError("Slot end time is invalid", 404);

                        const isInternalAvailable = await checkInternalAvailability(staffId, startTime, endTimeCalculated);
                        if (!isInternalAvailable) {
                            throw new AppError(`Staff ${staffData.userId.userName} is unavailable internally at ${startTime}`, 400);
                        }

                        // Check external (Google Calendar) availability
                        const isAvailable = await checkAvailability(authClient, staffId, startTime, endTimeCalculated);
                        if (!isAvailable) {
                            throw new AppError(`Staff ${staffData.userId.userName} is unavailable externally at ${startTime}`, 400);
                        }

                        // Create Google Calendar event for sub-slot
                        const event = await createEvent(req, authClient, {
                            summary: `Appointment with ${customer.userId.userName} and ${staffData.userId.userName}`,
                            description: `Service: ${services.map(service => service.serviceName).join(", ")}`,
                            customerName: customer.userId.userName,
                            staffName: staffData.userId.userName,
                            serviceNames: services.map(service => service.serviceName),
                            startTime: startTime,
                            endTime: endTimeCalculated,
                            calendarId: staffData.calendarId,
                            attendees: [{ email: customer.userId.email }],
                            sendUpdates: "all",
                            reminders: { useDefault: false, overrides: defaultReminders  },
                        });
                        createdEvents.push({ eventId: event.id, calendarId: staffData.calendarId });

                        subAppointments.push({ staffId, services, startTime, endTime: endTimeCalculated, eventId: event.id });
                        currentStartTime = new Date(endTimeCalculated);
                    }
                }
            }

            const appointment = new appointmentModel({
                startTime: appointmentStart,
                clientId,
                customerId,
                status: APPOINTMENT_STATUS,
                subAppointments,
                recurrence,
            });

            await appointment.save({ session });
            createdAppointments.push(appointment);


        }

        const existingAssignment = await customerClientModel.findOne({ customerId, clientId });
        if (!existingAssignment) {
            const assign = new customerClientModel({ customerId, clientId });
            await assign.save({ session });
        }

        const staffNames = SS.map(staffServices => staffServices.staff.userId.userName).join(", ");
        const allServices = SS.flatMap(staffServices => staffServices.services.map(service => service.serviceName));

        // Schedule reminders
        // await scheduleReminders(
        //     customer.userId.userName,
        //     createdAppointments,
        //     customer.userId.email,
        //     defaultReminders,
        //     staffNames,
        //     allServices,
        //     appointmentId,
        //     clientId
        // );

        await session.commitTransaction();
        session.endSession();


        return res.status(201).json({
            message: "Appointments and calendar events created successfully",
            appointments: createdAppointments,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        // Rollback created events in case of error
        await eventCreateRollback(createdEvents,authClient)

        return next(new AppError(`Failed to create appointment(s): ${error.message}`, 500));
    }
};
