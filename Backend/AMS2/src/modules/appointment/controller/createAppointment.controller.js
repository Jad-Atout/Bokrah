import { checkAvailability } from "../../../utils/Google/Services/checkAvailability.js";
import { AppError } from "../../../utils/AppError.js";
import mongoose from "mongoose";
import appointmentModel from "../../../../DB/models/appointment.js";
import createEvent from "../../../utils/Google/events/createEvent.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import staffModel from "../../../../DB/models/staff.js";
import customerModel from "../../../../DB/models/customer.js";
import customerClientModel from "../../../../DB/models/ClientCustomer.js";

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

                // Check availability
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

                // Save sub-appointment
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
        const assign = new customerClientModel(customerId,clientId)
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

        console.error("Error creating appointments and calendar events:", error);
        return next(new AppError(`Failed to create appointment(s): ${error.message}`, 500));
    }
};

export const calculateEndTime = (startTime, services) => {
    let totalDuration = services.reduce((acc, service) => acc + service.duration, 0);
    return new Date(new Date(startTime).getTime() + totalDuration * 60000).toISOString();
};

export const generateRecurringDates = (startTime, recurrence) => {
    let dates = [startTime];
    if (!recurrence || !recurrence.type || recurrence.count <= 1) return dates;
    const startDate = new Date(startTime);

    for (let i = 1; i < recurrence.count; i++) {
        const newDate = new Date(startDate);
        if (recurrence.type === "daily") newDate.setDate(newDate.getDate() + i);
        else if (recurrence.type === "weekly") newDate.setDate(newDate.getDate() + i * 7);
        else if (recurrence.type === "monthly") newDate.setMonth(newDate.getMonth() + i);
        dates.push(newDate.toISOString());
    }
    return dates;
};
