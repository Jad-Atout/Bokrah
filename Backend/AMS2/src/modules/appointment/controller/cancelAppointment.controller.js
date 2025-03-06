import mongoose from "mongoose";
import appointmentModel from "../../../../DB/models/appointment.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import { AppError } from "../../../utils/AppError.js";
import {cancelScheduledReminders} from "../../../utils/scheduler.js";
import createEvent from "../../../utils/Google/events/createEvent.js";
import {calendar} from "googleapis/build/src/apis/calendar/index.js";
import {eventDeleteRollback} from "./helpers.js";
//TODO delete the reminder
//TODO deleting events when appointment ends
export const cancelAppointment = async (req, res, next) => {
    const { appointmentId } = req.params;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;

    const session = await mongoose.startSession();
    session.startTransaction();
    const deletedEvents = [];

    const appointment = await appointmentModel.findById(appointmentId).
    populate([{
        path: "customerId",
        ref: "customer",
        populate: {
            path:"userId",
            ref: "user",
        }
    },{
        path:"subAppointments.staffId",
        ref:"staff"
    }]).
    session(session);
    try {

        if (!appointment) return next(new AppError("Appointment not found", 404));

        if (appointment.clientId.toString() !== clientId) return next(new AppError("Unauthorized: You cannot cancel this appointment", 403));

        if (appointment.status ==="Cancelled") return next(new AppError("Appointment is already cancelled", 404));

        for (const subAppointment of appointment.subAppointments) {
            subAppointment.status = "Cancelled"
            await appointment.save({session})
            const eventData = await deleteEvent(authClient, subAppointment.staffId.calendarId,subAppointment.eventId);
            deletedEvents.push({eventId:subAppointment.eventId, calendarId:subAppointment.staffId.calendarId,eventData:eventData})
        }

        appointment.status = "Cancelled";
        await appointment.save({ session });

        cancelScheduledReminders(appointmentId);

        await session.commitTransaction();
        session.endSession();
        return res.status(200).json({
            message: "Appointment cancelled successfully",
            deletedEvents: deletedEvents
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        await eventDeleteRollback(deletedEvents,appointment)


        return next(new AppError(`Failed to cancel the appointment: ${error.message}`, 500));
    }
};
