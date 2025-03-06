import { AppError } from "../../../utils/AppError.js";
import appointmentModel from "../../../../DB/models/appointment.js";
import createEvent from "../../../utils/Google/events/createEvent.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import {
    calculateEndTime,
    checkInternalAvailability,
    eventCreateRollback,
    eventDeleteRollback,
    generateRecurringDates
} from "./helpers.js";
import reminderModel from "../../../../DB/models/reminder.js"
import staffModel from "../../../../DB/models/staff.js"
import mongoose from "mongoose";
import {checkAvailability} from "../../../utils/Google/Services/checkAvailability.js";
//TODO ownership

export const updateAppointment = async (req, res, next) => {
    const { appointmentId, recurrence, slot } = req.body;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;
    const session = await mongoose.startSession();
    session.startTransaction();
    let updatedEvents = [];
    let deletedEvents = [];
    let updatedAppointments = [];

    const appointment = await appointmentModel.findById(appointmentId).populate([
            {path: "customerId", ref: "Customer", populate: {path: "userId", model: "User",}},
            {path: "subAppointments.staffId", ref: "Staff",}]).session(session);
    try {

        if (!appointment) return next(new AppError("Appointment not found", 404));
        const customer = appointment.customerId
        if (!customer) return next(new AppError("Customer not found", 404));

        for (const subAppointment of appointment.subAppointments) {
            subAppointment.status = "Cancelled";
            await subAppointment.save({ session });
            const eventData = await deleteEvent(authClient, subAppointment.staffId.calendarId, subAppointment.eventId);
            deletedEvents.push({ eventId: subAppointment.eventId, calendarId: subAppointment.staffId.calendarId, eventData });
        }

        const reminderSettings = await reminderModel.findOne({ clientId });
        const defaultReminders = reminderSettings?.reminderTimes?.map((time, index) => ({
            method: reminderSettings.reminderMethods?.[index % reminderSettings.reminderMethods.length] || "email",
            minutes: Number.isFinite(time) ? time : 60, // Default to 60 minutes if invalid
        })) || [{ method: "email", minutes: 60 }];

        const appointmentDates = generateRecurringDates(slot[0].startTime, recurrence);

        // Create the appointment
        for (const appointmentStart of appointmentDates) {
            let subAppointments = [];
            let currentStartTime = new Date(appointmentStart);
//This for loop is extra
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
                            customerName: customer.userId.userName,
                            staffName: staffData.userId.userName,
                            serviceNames: services.map(service => service.serviceName),
                            startTime: startTime,
                            endTime: endTimeCalculated,
                            calendarId: staffData.calendarId,
                            attendees: [{ email: customer.userId.email }],
                            sendUpdates: "all",
                            reminders: { useDefault: false, overrides: reminderSettings },
                        });
                        updatedEvents.push({ eventId: event.id, calendarId: staffData.calendarId });
                        subAppointments.push({ staffId, services, startTime, endTime: endTimeCalculated, eventId: event.id });
                        currentStartTime = new Date(endTimeCalculated);
                    }
                }
            }


            const newStaffIds = new Set(subAppointments.map(sub => sub.staffId.toString()));
            for (const currentSub of appointment.subAppointments) {
                if (!newStaffIds.has(currentSub.staffId._id.toString())) {
                    currentSub.status = "Cancelled";
                    subAppointments.push(currentSub);
                    // TODO: Send email notification to the deleted staff
                }
            }




// Now, you can proceed with updating the main appointment with the updated subAppointments


            const updatedAppointment = await appointmentModel.findByIdAndUpdate(
                appointmentId,
                {
                    startTime: appointmentStart,
                    clientId,
                    status: "Booked",
                    subAppointments,
                    recurrence,
                },
                { new: true, session }
            );
            updatedAppointments.push(updatedAppointment);

        }



        // const staffNames = updatedAppointments.flatMap(appointment => appointment.subAppointments.map(sub => sub.staffId.userId.userName)).join(", ");
        // const allServices = updatedAppointments.flatMap(appointment => appointment.subAppointments.flatMap(sub => sub.services.map(service => service.serviceName)));

        // Schedule reminders
        // await scheduleReminders(
        //     customer.userId.userName,
        //     updatedAppointments,
        //     customer.userId.email,
        //     defaultReminders,
        //     staffNames,
        //     allServices
        // );

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: "Appointment updated and calendar events created successfully",
            appointments: updatedAppointments,
        });

    } catch (error) {

        await session.abortTransaction();
        session.endSession();

        await eventCreateRollback(updatedEvents,authClient)
        await eventDeleteRollback(req,authClient,deletedEvents,appointment)

        return next(new AppError(`Failed to update appointment(s): ${error.message}`, 500));
    }
};