import mongoose from "mongoose";
import appointmentModel from "../../../../DB/models/appointment.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import { AppError } from "../../../utils/AppError.js";
//TODO deleting events when appointment ends
export const cancelAppointment = async (req, res, next) => {
    const { appointmentId } = req.params;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;

    const session = await mongoose.startSession();
    session.startTransaction();
    const deletedEvents = [];

    try {
        const appointment = await appointmentModel.findById(appointmentId).populate('subAppointments.staffId').session(session);
        if (!appointment) {
            return next(new AppError("Appointment not found", 404));
        }
        if (appointment.clientId.toString() !== clientId) return next(new AppError("Unauthorized: You cannot cancel this appointment", 403));

        if (appointment.status ==="Cancelled") return next(new AppError("Appointment is already cancelled", 404));

        for (const subAppointment of appointment.subAppointments) {
            const { eventId } = subAppointment;
            subAppointment.eventId = null
            const calendarId = subAppointment.staffId.calendarId;
            if (eventId) {
                await deleteEvent(authClient, calendarId, eventId);
                deletedEvents.push({ eventId, calendarId });
            }
        }

        appointment.status = "Cancelled";
        await appointment.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: "Appointment cancelled successfully",
            deletedEvents: deletedEvents
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        for (const event of deletedEvents) {
            if (event?.eventId) {
                await deleteEvent(authClient, event.calendarId, event.eventId);
            }
        }
        return next(new AppError(`Failed to cancel the appointment: ${error.message}`, 500));
    }
};
