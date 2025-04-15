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

import { transCreateCustomer } from "../../../../DB/Controller/customer.DB.controller.js";
import { scheduleReminders } from "../../../utils/Scheduler/reminderSchedules.js";
import UserClient from "../../../../DB/models/ClientCustomer.js";
import {createNotification} from "../../notification/notification.controller.js";
import {appointmentTemplates} from "../../notification/notification.templet.js";
import clientModel from "../../../../DB/models/client.js";
export const createAppointment = async (req, res, next) => {
    // ADDED NOTES FIELD in destructuring
    let { customerId, recurrence, slot, userId, notes } = req.body;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;
    const APPOINTMENT_STATUS = "Booked";
    const session = await mongoose.startSession();
    session.startTransaction();
    let createdEvents = [];
    let createdAppointment = [];
    let notificationServices = []

    try {
        // If no customerId is provided but userId is given, create or find the Customer
        if (!customerId && userId) {
            let foundCustomer = await customerModel.findOne({ userId });
            if (!foundCustomer) {
                const { customer } = await transCreateCustomer({ userId });
                if (!customer) {
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
        if (
            customer.userId.authProvider === "local" &&
            !customer.userId.confirmed
        ) {
            return next(new AppError("Customer must be confirmed", 401));
        }

        // Generate all recurrence dates
        const appointmentDates = generateRecurringDates(slot.startTime, recurrence);

        for (const appointmentStart of appointmentDates) {
            let subAppointments = [];

            for (const subSlot of slot.subSlots) {
                let { staffServices, startTime, endTime } = subSlot;

                let adjustedStartTime = new Date(appointmentStart);
                adjustedStartTime.setHours(
                    new Date(startTime).getHours(),
                    new Date(startTime).getMinutes(),
                    0,
                    0
                );

                let adjustedEndTime = new Date(appointmentStart);
                adjustedEndTime.setHours(
                    new Date(endTime).getHours(),
                    new Date(endTime).getMinutes(),
                    0,
                    0
                );

                if (adjustedStartTime >= adjustedEndTime) {
                    throw new AppError("End time must be later than start time", 400);
                }

                for (const staffService of staffServices) {
                    const { staffId, services } = staffService;
                    notificationServices = [...services];
                    const staffData = await staffModel
                        .findById(staffId)
                        .populate([{ path: "userId", ref: "User", select: "userName email" }])
                        .session(session);

                    const endTimeCalculated = calculateEndTime(adjustedStartTime, services);

                    if (
                        adjustedEndTime.getTime() !==
                        new Date(endTimeCalculated).getTime()
                    ) {
                        throw new AppError("Slot end time is invalid", 404);
                    }

                    // Create Google Calendar event
                    const event = await createEvent(req, authClient, {
                        summary: `Appointment with ${customer.userId.userName} and ${staffData.userId.userName}`,
                        description: `Service: ${services.map(service => service.serviceName).join(", ")}`,
                        customerName: customer.userId.userName,
                        staffName: staffData.userId.userName,
                        serviceNames: services.map(service => service.serviceName),
                        startTime: adjustedStartTime,
                        endTime: endTimeCalculated,
                        calendarId: staffData.calendarId,
                        attendees: [{ email: customer.userId.email }],
                        sendUpdates: "all",
                    });

                    createdEvents.push({
                        eventId: event.id,
                        calendarId: staffData.calendarId
                    });

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

        // If the customer-client link does not exist, create it
        const existingAssignment = await customerClientModel.findOne({
            customerId,
            clientId
        });
        if (!existingAssignment) {
            const assign = new customerClientModel({ customerId, clientId });
            await assign.save({ session });
        }

        await session.commitTransaction();
        session.endSession();

        // Schedule reminders for each created appointment
        for (const appointment of createdAppointment) {
            await scheduleReminders(appointment._id);
        }


        const client = await clientModel.findById(clientId)
        await createNotification([customer.userId._id,client.userId],
            appointmentTemplates.booked({
                customerName:customer.userId.userName,
                serviceNames:notificationServices.map(service => service.serviceName),
                date: new Date(createdAppointment[0].subAppointments[0].startTime).toString(),
            }))




        return res.status(201).json({
            message: "Appointments and calendar events created successfully",
            appointments: createdAppointment
        });
    } catch (error) {
        console.log(error);
        await session.abortTransaction();
        session.endSession();

        // Roll back any Google events created
        await eventCreateRollback(createdEvents, authClient);

        return next(
            new AppError(`Failed to create appointment(s): ${error.message}`, 500)
        );
    }
};

export const getAppointmentsCount = async (req, res, next) => {
    try {
        const appointmentCount = await appointmentModel.countDocuments();
        return res
            .status(200)
            .json({ message: "Success", count: appointmentCount });
    } catch (error) {
        console.error("Error fetching appointment count:", error);
        return res
            .status(500)
            .json({ message: "Server error", error: error.message });
    }
};

export const getAppointmentsByCustomer = async (req, res, next) => {
    try {
        const { clientId } = req.authUser; // from the token
        const { customerId } = req.params; // from the route

        // Ensure that this customer is linked to this client
        const link = await UserClient.findOne({ clientId, customerId });
        if (!link) {
            return next(
                new AppError(
                    "This customer does not belong to the current client",
                    404
                )
            );
        }

        // Find all appointments with that customerId + clientId
        const appointments = await appointmentModel
            .find({ customerId, clientId })
            .populate({
                path: "subAppointments",
                populate: [
                    {
                        path: "staffId",
                        select: "roleDescription calendarId",
                        populate: {
                            path: "userId",
                            select: "userName email"
                        }
                    },
                    {
                        path: "services._id",
                        model: "Service",
                        select: "serviceName price duration"
                    }
                ]
            })
            .exec();

        return res.status(200).json({
            message: "success",
            appointments
        });
    } catch (error) {
        console.error("Error fetching appointments by customer:", error);
        return next(
            new AppError(`Failed to retrieve appointments: ${error.message}`, 500)
        );
    }
};
