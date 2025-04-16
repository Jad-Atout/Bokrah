import { AppError } from "../../../utils/AppError.js";
import appointmentModel from "../../../../DB/models/appointment.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import mongoose from "mongoose";
import {eventDeleteRollback} from "./utils/helpers.js";
import {cancelReminders} from "../../../utils/Scheduler/reminderSchedules.js";

export const deleteAppointment = async (req, res, next) => {
    const { appointmentId } = req.body;
    const authClient = req.oauth2Client;

    const session = (req.session) ? req.session : await mongoose.startSession();
    session.startTransaction();
    let deletedEvents = [];
    let deletedAppointments = [];

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
        if (!appointment) {
            return next(new AppError("Appointment not found", 404));
        }

         await appointmentModel.findByIdAndDelete(appointmentId, { session });
        deletedAppointments.push(appointment);
        for (const subAppointment of appointment.subAppointments) {
            const eventData = await deleteEvent(authClient, subAppointment.staffId.calendarId,subAppointment.eventId);
            deletedEvents.push({eventId:subAppointment.eventId, calendarId:subAppointment.staffId.calendarId,eventData})
        }
        req.deletedEvents = deletedEvents;
        await cancelReminders(appointmentId);

        await session.commitTransaction();
        session.endSession();


        return res.status(200).json({
            message: "Appointment and associated events deleted successfully",
            deletedAppointments,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
       await eventDeleteRollback(req,authClient,deletedEvents,appointment)


        return next(new AppError(`Failed to delete appointment(s): ${error}`, 500));
    }
};
