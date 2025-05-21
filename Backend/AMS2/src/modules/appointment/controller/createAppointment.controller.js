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
    console.log("=== Starting createAppointment ===");
    console.log("Request body:", req.body);
    console.log("Request params:", req.params);
    
    let { customerId, recurrence, slot, userId, notes } = req.body;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;
    const APPOINTMENT_STATUS = "Booked";
    
    console.log("Initial data:", {
        customerId,
        recurrence,
        slot,
        userId,
        notes,
        clientId
    });

    const session = await mongoose.startSession();
    session.startTransaction();
    console.log("Transaction started");

    let createdEvents = [];
    let createdAppointment = [];
    let notificationServices = [];

    try {
        // 1. Ensure customer exists or create new
        console.log("Checking customer existence...");
        if (!customerId && userId) {
            console.log("No customerId provided, searching by userId:", userId);
            let foundCustomer = await customerModel.findOne({ userId });
            if (!foundCustomer) {
                console.log("Customer not found, creating new customer...");
                const { customer } = await transCreateCustomer({ userId });
                if (!customer) throw new AppError("Failed to create newCustomer", 500);
                customerId = customer;
                console.log("New customer created:", customerId);
            } else {
                customerId = foundCustomer;
                console.log("Existing customer found:", customerId);
            }
        }

        const customer = await customerModel.findById(customerId)
            .populate([{ path: "userId", ref: "User" }]);

        console.log("Customer data:", customer);

        if (!customer?.userId) return next(new AppError("Customer not found", 404));
        if (customer.userId.authProvider === "local" && !customer.userId.confirmed) {
            return next(new AppError("Customer must be confirmed", 401));
        }

        // 2. Generate recurring dates
        console.log("Generating recurring dates...");
        const appointmentDates = generateRecurringDates(slot.startTime, recurrence);
        console.log("Generated dates:", appointmentDates);

        // Check for overlapping appointments for the customer
        for (const appointmentStart of appointmentDates) {
            const startTime = new Date(appointmentStart);
            const endTime = new Date(slot.endTime);
            
            console.log("Checking for overlapping appointments:", {
                startTime,
                endTime,
                customerId
            });

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

            console.log("Found overlapping appointments:", overlappingAppointments.length);
        }

        for (const appointmentStart of appointmentDates) {
            console.log("Processing appointment date:", appointmentStart);
            let subAppointments = [];

            for (const subSlot of slot.subSlots) {
                console.log("Processing subSlot:", subSlot);
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

                console.log("Adjusted times:", {
                    adjustedStartTime,
                    adjustedEndTime
                });

                if (adjustedStartTime >= adjustedEndTime) {
                    throw new AppError("End time must be later than start time", 400);
                }

                for (const staffService of staffServices) {
                    console.log("Processing staff service:", staffService);
                    const { staffId, services } = staffService;
                    
                    // Validate multiple services setting
                    await validateMultipleServices(clientId, services);
                    
                    notificationServices = [...services];

                    const staffData = await staffModel
                        .findById(staffId)
                        .populate([{ path: "userId", ref: "User", select: "userName email" }])
                        .session(session);

                    console.log("Staff data:", staffData);

                    const endTimeCalculated = calculateEndTime(adjustedStartTime, services);
                    console.log("Calculated end time:", endTimeCalculated);

                    if (adjustedEndTime.getTime() < new Date(endTimeCalculated).getTime()) {
                        throw new AppError("Slot end time is too short for the selected services", 404);
                    }

                    // 3. Create Google Calendar Event
                    console.log("Creating Google Calendar event...");
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

                    console.log("Google Calendar event created:", event.id);
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

            console.log("Saving appointment:", appointment);
            await appointment.save({ session });
            createdAppointment.push(appointment);
        }

        // 4. Link customer to a client if not already
        console.log("Checking customer-client link...");
        const existingAssignment = await customerClientModel.findOne({ customerId, clientId });
        if (!existingAssignment) {
            console.log("Creating new customer-client link...");
            const assign = new customerClientModel({ customerId, clientId });
            await assign.save({ session });
        }

        console.log("Committing transaction...");
        await session.commitTransaction();
        session.endSession();
        console.log("Transaction committed successfully");

        // 5. Schedule reminders and notifications
        console.log("Scheduling reminders...");
        for (const appointment of createdAppointment) {
            await scheduleReminders(appointment._id);
        }

        console.log("Sending notifications with data:", {
            appointments: createdAppointment,
            customer,
            clientId,
            notificationServices,
            authUser: req.authUser
        });

        await sendAppointmentBookedNotifications({
            appointments: createdAppointment,
            customer,
            clientId,
            notificationServices,
            authUser: req.authUser
        });

        console.log("=== Appointment creation completed successfully ===");
        return res.status(201).json({
            message: "Appointments and calendar events created successfully",
            appointments: createdAppointment
        });
    } catch (error) {
        console.error("=== Error in createAppointment ===");
        console.error("Error details:", error);
        if (session.inTransaction()) {
            console.log("Aborting transaction...");
            await session.abortTransaction();
        }
        session.endSession();
        console.log("Rolling back created events...");
        await eventCreateRollback(createdEvents, authClient);

        return next(new AppError(`Failed to create appointment(s): ${error.message}`, 500));
    }
};
