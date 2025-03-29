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

import {transCreateCustomer} from "../../../../DB/Controller/customer.DB.controller.js";
import {scheduleReminders} from "../../../utils/Scheduler/reminderSchedules.js";
import UserClient from "../../../../DB/models/ClientCustomer.js";


/*
Token expiry updated and saved.
AppError: Failed to create newCustomer
    at createAppointment (file:///C:/Users/HP/Bokrah/Backend
ess/task_queues:95:5)
    at async file:///C:/Users/HP/Bokrah/Backend/AMS2/src/utils/catchError.js:4:20 {
  statusCode: 500
}

 */

export const createAppointment = async (req, res, next) => {
    let { customerId, recurrence, slot, userId } = req.body;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;
    const APPOINTMENT_STATUS = "Booked";
    const session = await mongoose.startSession();
    session.startTransaction();
    let createdEvents = [];
    let createdAppointment = []


    if (!customerId && userId) {
        let foundCustomer = await customerModel.findOne({ userId });
        if (!foundCustomer) {
            const {customer} = await transCreateCustomer({ userId });
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
    if(customer.userId.authProvider ==="local" && !customer.userId.confirmed) return next(new AppError("Customer must be confirmed", 401));

    try {

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

                        // const isInternalAvailable = await checkInternalAvailability(staffId, startTime, endTimeCalculated);
                        // if (!isInternalAvailable) {
                        //     throw new AppError(`Staff ${staffData.userId.userName} is unavailable internally at ${startTime}`, 400);
                        // }

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
            createdAppointment.push(appointment)



        }

        const existingAssignment = await customerClientModel.findOne({ customerId, clientId });
        if (!existingAssignment) {
            const assign = new customerClientModel({ customerId, clientId });
            await assign.save({ session });
        }



        await session.commitTransaction();
        session.endSession();

        for (const appointment of createdAppointment) {
            await scheduleReminders(appointment._id,);
        }
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

export const getAppointmentsCount = async (req, res, next) => {
    try {
        const appointmentCount = await appointmentModel.countDocuments();
        return res.status(200).json({ message: "Success", count: appointmentCount });
    } catch (error) {
        console.error("Error fetching appointment count:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};


export const getAppointmentsByCustomer = async (req, res, next) => {
    try {
        const { clientId } = req.authUser;     // from the token
        const { customerId } = req.params;     // from the route, e.g. GET /appointment/customer/:customerId ?

        // 1) Ensure that this customer is actually linked to this client
        const link = await UserClient.findOne({ clientId, customerId });
        if (!link) {
            return next(new AppError("This customer does not belong to the current client", 404));
        }

        // 2) Find all appointments with that customerId + clientId
        //    You can expand 'subAppointments' with .populate if you want staff details or services
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
                            select: "userName email",
                        },
                    },
                    {
                        path: "services._id", // or if your field is "services.serviceId"
                        model: "Service",
                        select: "serviceName price duration",
                    },
                ],
            })
            .exec();

        // 3) Return them
        return res.status(200).json({
            message: "success",
            appointments,
        });
    } catch (error) {
        console.error("Error fetching appointments by customer:", error);
        return next(new AppError(`Failed to retrieve appointments: ${error.message}`, 500));
    }
};
