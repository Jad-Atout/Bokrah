import { checkAvailability } from "../../../utils/Google/Services/checkAvailability.js";
import { AppError } from "../../../utils/AppError.js";
import mongoose from "mongoose";
import appointmentModel from "../../../../DB/models/appointment.js";
import createEvent from "../../../utils/Google/events/createEvent.js";
import staffModel from "../../../../DB/models/staff.js";
import customerModel from "../../../../DB/models/customer.js";
import customerClientModel from "../../../../DB/models/ClientCustomer.js";
import {
    calculateEndTime,
    checkInternalAvailability,
    generateRecurringDates,
    eventCreateRollback
} from "./helpers.js";

import reminderModel from "../../../../DB/models/reminder.js";
import {transCreateCustomer} from "../../../../DB/Controller/customer.DB.controller.js";
import {scheduleReminders} from "../../../utils/Scheduler/reminderSchedules.js";




export const createAppointment = async (req, res, next) => {
    let { customerId, recurrence, slot, userId } = req.body;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;
    const SS = req.staffsServices;
    const APPOINTMENT_STATUS = "Booked";
    const session = await mongoose.startSession();
    session.startTransaction();
    let createdEvents = [];
    let createdAppointment;
    let appointmentId;

    if (!customerId && userId) {
        let foundCustomer = await customerModel.findOne({ userId });
        if (!foundCustomer) {
            const {customer} = await transCreateCustomer({ userId });
            if (customer) {
                throw new AppError("Failed to create newCustomer", 500);
            }
            customerId = customer;
        } else {
            customerId = foundCustomer;
        }
    }

    const customer = await customerModel.findById(customerId)
        .populate([{ path: "userId", ref: "User" }]);

    if (!customer?.userId) return next(new AppError("Customer not found", 404));
    if(customer.userId.authProvider ==="local" && !customer.userId.confirmed) return next(new AppError("Customer must be confirmed", 401));

    try {
        const reminderSettings = await reminderModel.findOne({ clientId });
        const defaultReminders =
            reminderSettings?.reminderTimes?.map((time, index) => ({
                method:
                    reminderSettings.reminderMethods?.[index % reminderSettings.reminderMethods.length] || "email",
                minutes: Number.isFinite(time) ? time : 60,
            })) || [{ method: "email", minutes: 60 }];

        const appointmentDates = generateRecurringDates(slot.startTime, recurrence);
        for (const appointmentStart of appointmentDates) {
            let subAppointments = [];
            let currentStartTime = new Date(appointmentStart);


                for (const subSlot of slot.subSlots) {
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
                        if (endTime !== endTimeCalculated) throw new AppError("Slot end time is invalid", 404);

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
                            reminders: { useDefault: false, overrides: defaultReminders },
                        });
                        createdEvents.push({ eventId: event.id, calendarId: staffData.calendarId });

                        subAppointments.push({ staffId, services, startTime, endTime: endTimeCalculated, eventId: event.id });
                        currentStartTime = new Date(endTimeCalculated);
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
            createdAppointment=appointment;
            appointmentId = appointment._id.toString();
        }

        const existingAssignment = await customerClientModel.findOne({ customerId, clientId });
        if (!existingAssignment) {
            const assign = new customerClientModel({ customerId, clientId });
            await assign.save({ session });
        }

        // Schedule reminders
        await scheduleReminders(
            createdAppointment,
            authClient,
            defaultReminders.map((reminder) => ({
                minutes: reminder.minutes,
                email: customer.userId.email,
                userName: customer.userId.userName,
                clientId,
            }))
        );


        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({
            message: "Appointments and calendar events created successfully",
            appointments: createdAppointment,
        });
    } catch (error) {
        console.log(error)
        await session.abortTransaction();
        session.endSession();

        await eventCreateRollback(createdEvents, authClient);

        return next(new AppError(`Failed to create appointment(s): ${error.message}`, 500));
    }
};