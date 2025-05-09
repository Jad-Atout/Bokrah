// ================================
// 📦 Imports
// ================================
import mongoose from "mongoose";
import { AppError } from "../../../utils/AppError.js";

import appointmentModel from "../../../../DB/models/appointment.js";
import clientModel from "../../../../DB/models/client.js";
import staffModel from "../../../../DB/models/staff.js";
import customerModel from "../../../../DB/models/customer.js";
import customerClientModel from "../../../../DB/models/ClientCustomer.js";

import { transCreateCustomer } from "../../../../DB/Controller/customer.DB.controller.js";
import createEvent from "../../../utils/Google/events/createEvent.js";
import { scheduleReminders } from "../../../utils/Scheduler/reminderSchedules.js";
import { createNotification } from "../../notification/notification.controller.js";
import { appointmentTemplates } from "../../notification/notificationTemplate.js";
import {sendAppointmentBookedNotifications} from "./utils/notificationSenders.js"
import {
    calculateEndTime,
    generateRecurringDates,
    eventCreateRollback,
    resolveTriggeredBy
} from "./utils/helpers.js";
import { validateMultipleServices } from "../../bookingSettings/utils/bookingSettingsUtils.js";


// ================================
// 📅 Create Appointment Controller
// ================================
export const createAppointment = async (req, res, next) => {
    let { customerId, recurrence, slot, userId, notes } = req.body;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;
    const APPOINTMENT_STATUS = "Booked";
    const session = await mongoose.startSession();
    session.startTransaction();

    let createdEvents = [];
    let createdAppointment = [];
    let notificationServices = [];

    try {
        // 1. Ensure customer exists or create new
        if (!customerId && userId) {
            let foundCustomer = await customerModel.findOne({ userId });
            if (!foundCustomer) {
                const { customer } = await transCreateCustomer({ userId });
                if (!customer) throw new AppError("Failed to create newCustomer", 500);
                customerId = customer;
            } else {
                customerId = foundCustomer;
            }
        }

        const customer = await customerModel.findById(customerId)
            .populate([{ path: "userId", ref: "User" }]);

        if (!customer?.userId) return next(new AppError("Customer not found", 404));
        if (customer.userId.authProvider === "local" && !customer.userId.confirmed) {
            return next(new AppError("Customer must be confirmed", 401));
        }

        // 2. Generate recurring dates
        const appointmentDates = generateRecurringDates(slot.startTime, recurrence);

        // Check for overlapping appointments for the customer
        for (const appointmentStart of appointmentDates) {
            const startTime = new Date(appointmentStart);
            const endTime = new Date(slot.endTime);
            
            // Find any existing appointments for this customer that overlap with the new appointment time
            const overlappingAppointments = await appointmentModel.find({
                customerId,
                status: "Booked",
                $or: [
                    {
                        "subAppointments.startTime": { $lt: endTime },
                        "subAppointments.endTime": { $gt: startTime }
                    }
                ]
            }).session(session);

         /*    if (overlappingAppointments.length > 0) {
                throw new AppError("Customer already has an appointment scheduled during this time", 400);
            } */
        }

        for (const appointmentStart of appointmentDates) {
            let subAppointments = [];

            for (const subSlot of slot.subSlots) {
                let { staffServices, startTime, endTime } = subSlot;

                let adjustedStartTime = new Date(appointmentStart);
                adjustedStartTime.setHours(
                    new Date(startTime).getHours(),
                    new Date(startTime).getMinutes(),
                    0, 0
                );

                let adjustedEndTime = new Date(appointmentStart);
                adjustedEndTime.setHours(
                    new Date(endTime).getHours(),
                    new Date(endTime).getMinutes(),
                    0, 0
                );

                if (adjustedStartTime >= adjustedEndTime) {
                    throw new AppError("End time must be later than start time", 400);
                }

                for (const staffService of staffServices) {
                    const { staffId, services } = staffService;
                    
                    // Validate multiple services setting
                    await validateMultipleServices(clientId, services);
                    
                    notificationServices = [...services];

                    const staffData = await staffModel
                        .findById(staffId)
                        .populate([{ path: "userId", ref: "User", select: "userName email" }])
                        .session(session);

                    const endTimeCalculated = calculateEndTime(adjustedStartTime, services);

                    if (adjustedEndTime.getTime() !== new Date(endTimeCalculated).getTime()) {
                        throw new AppError("Slot end time is invalid", 404);
                    }

                    // 3. Create Google Calendar Event
                    const event = await createEvent(req, authClient, {
                        summary: `Appointment with ${customer.userId.userName} and ${staffData.userId.userName}`,
                        description: `Service: ${services.map(s => s.serviceName).join(", ")}`,
                        customerName: customer.userId.userName,
                        staffName: staffData.userId.userName,
                        serviceNames: services.map(s => s.serviceName),
                        startTime: adjustedStartTime,
                        endTime: endTimeCalculated,
                        calendarId: staffData.calendarId,
                        attendees: [{ email: customer.userId.email }],
                        sendUpdates: "all",
                    });

                    createdEvents.push({ eventId: event.id, calendarId: staffData.calendarId });

                    subAppointments.push({
                        staffId,
                        services,
                        startTime: adjustedStartTime,
                        endTime: endTimeCalculated,
                        eventId: event.id
                    });
                }
            }

            const appointment = new appointmentModel({
                clientId,
                customerId,
                status: APPOINTMENT_STATUS,
                notes,
                subAppointments,
                recurrence
            });

            await appointment.save({ session });
            createdAppointment.push(appointment);
        }

        // 4. Link customer to a client if not already
        const existingAssignment = await customerClientModel.findOne({ customerId, clientId });
        if (!existingAssignment) {
            const assign = new customerClientModel({ customerId, clientId });
            await assign.save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        // 5. Schedule reminders and notifications
        for (const appointment of createdAppointment) {
            await scheduleReminders(appointment._id);
        }

        await sendAppointmentBookedNotifications({
            appointments: createdAppointment,
            customer,
            clientId,
            notificationServices,
            authUser: req.authUser
        });

        return res.status(201).json({
            message: "Appointments and calendar events created successfully",
            appointments: createdAppointment
        });
    } catch (error) {
        console.error(error);
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        await eventCreateRollback(createdEvents, authClient);

        return next(new AppError(`Failed to create appointment(s): ${error.message}`, 500));
    }
};
