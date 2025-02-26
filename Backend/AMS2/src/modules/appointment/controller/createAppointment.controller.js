import { checkAvailability } from "../../../utils/Google/Services/checkAvailability.js";
import { AppError } from "../../../utils/AppError.js";
import mongoose from "mongoose";
import appointmentModel from "../../../../DB/models/appointment.js";
import createEvent from "../../../utils/Google/events/createEvent.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import staffModel from "../../../../DB/models/staff.js";
import customerModel from "../../../../DB/models/customer.js";
import customerClientModel from "../../../../DB/models/ClientCustomer.js";
import {calculateEndTime, checkInternalAvailability, generateRecurringDates} from "./helpers.js";

export const createAppointment = async (req, res, next) => {
    const { startTime, customerId, recurrence, bufferTime = 0 } = req.body;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;
    const staffsServices = req.staffsServices;
    const APPOINTMENT_STATUS = "Booked";

    const session = await mongoose.startSession();
    session.startTransaction();
    let createdEvents = [];
    let createdAppointments = [];
    const customer = await customerModel.findById(customerId).populate([{
        path:"userId",
        ref:"User",
        select:"userName",
    }]).select("userName");

    try {
        const appointmentDates = generateRecurringDates(startTime, recurrence);

        for (const appointmentStart of appointmentDates) {
            let subAppointments = [];
            let currentStartTime = new Date(appointmentStart); // Track the start time

            for (const staffServices of staffsServices) {
                const { staff, services } = staffServices;
                const staffId = staff._id

                const staffData = await staffModel.findById(staffId)
                    .populate([{ path: "userId", ref: "User", select: "userName" }])
                    .session(session);

                const endTime = calculateEndTime(currentStartTime, services);

                const isInternalAvailable = await checkInternalAvailability(staffId, currentStartTime, endTime);
                if (!isInternalAvailable) {
                    return next(new AppError(`Staff ${staffData.userId.userName} is unavailable according to internal availability at ${currentStartTime.toISOString()}`, 400));
                }

                const isAvailable = await checkAvailability(authClient, staffId, currentStartTime, endTime);
                if (!isAvailable) {
                    return next(new AppError(`Staff ${staffData.userId.userName} is unavailable at ${currentStartTime.toISOString()}`, 400));
                }

                const event = await createEvent(authClient,
                    {
                        customerName:customer.userId.userName,
                        staffName:staffData.userId.userName,
                        serviceNames:services.map(service => service.serviceName),
                        startTime:currentStartTime,
                        endTime ,
                        calendarId:staffData.calendarId
                    }
                );
                createdEvents.push({ eventId: event.id, calendarId: staffData.calendarId });

                subAppointments.push({ staffId, services, startTime: currentStartTime, endTime, eventId: event.id });

                currentStartTime = new Date(endTime);
                currentStartTime.setMinutes(currentStartTime.getMinutes() + bufferTime);

            }

            const appointment = new appointmentModel({
                startTime: appointmentStart,
                clientId,
                customerId,
                status: APPOINTMENT_STATUS,
                subAppointments,
            });

            await appointment.save({ session });
            createdAppointments.push(appointment);
        }
        //TODO after adding this we have to make sure when deleting to keep data intgrity
        const assign = new customerClientModel({customerId:customerId,clientId})
        await assign.save({session})

        await session.commitTransaction();
        session.endSession();


        return res.status(201).json({
            message: "Appointments and calendar events created successfully",
            appointments: createdAppointments,
            events: createdEvents,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        for (const event of createdEvents) {
            if (event?.eventId) {
                await deleteEvent(authClient, event.calendarId, event.eventId);
            }
        }
        return next(new AppError(`Failed to create appointment(s): ${error.message}`, 500));
    }
};




