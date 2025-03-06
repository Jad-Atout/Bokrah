// controller/cancelSubAppointment.controller.js
import mongoose from "mongoose";
import appointmentModel from "../../../../DB/models/appointment.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import { AppError } from "../../../utils/AppError.js";

// This cancels one subAppointment from an appointment, not the entire thing
export const cancelSubAppointment = async (req, res, next) => {
    const { appointmentId, subAppointmentId, clientId } = req.params;
    const authClient = req.oauth2Client; // your Google Auth
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1) Find the appointment
        const appointment = await appointmentModel
            .findById(appointmentId)
            .populate("subAppointments.staffId")
            .session(session);

        if (!appointment) {
            return next(new AppError("Appointment not found", 404));
        }

        // (Optional) Check if user is authorized to cancel this subAppointment
        if (appointment.clientId.toString() !== clientId) {
            return next(
                new AppError("Unauthorized: You cannot cancel this appointment", 403)
            );
        }

        // 2) Find the subAppointment you want to cancel
        const subAppointment = appointment.subAppointments.find(sub => {
            return sub._id.toString() === subAppointmentId;
        });

        if (!subAppointment) {
            return next(new AppError("Sub-appointment not found", 404));
        }

        // 3) Cancel the Google Calendar event for that subAppointment
        const eventId = subAppointment.eventId;
        console.log(eventId);
        if (eventId) {
            const staffId = subAppointment.staffId; // staffId is a doc, populated with .calendarId
            if (staffId?.calendarId) {
                await deleteEvent(authClient, staffId.calendarId, eventId);
            }
        }

        // 4) Update sub-appointment status to "Cancelled"
        subAppointment.status = "Cancelled";

        // 5) Check if all sub-appointments are cancelled, then update the parent appointment's status
        if (appointment.subAppointments.every(sub => sub.status === "Cancelled")) {
            appointment.status = "Cancelled"; // Cancel the parent appointment if all sub-appointments are cancelled
        }

        // Save the updated appointment
        await appointment.save({ session });
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: "Sub-appointment cancelled successfully",
            cancelledSubAppointmentId: subAppointmentId,
            remainingSubAppointments: appointment.subAppointments,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return next(
            new AppError(`Failed to cancel the sub-appointment: ${error.message}`, 500)
        );
    }
};
