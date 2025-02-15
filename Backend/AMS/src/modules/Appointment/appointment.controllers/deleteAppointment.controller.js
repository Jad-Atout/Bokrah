import { AppError } from "../../../utils/AppError.js";
import sequelize from "../../../../DB/connection.js";
import { Model as appointmentServicesModel } from "sequelize";
import { staffModel } from "../../../../DB/model/relations.js";
import deleteEvent from "../../../utils/Google/Events.Controller/deleteEvent.js";

export const deleteAppointment = async (req, res, next) => {
    const appointment = req.appointment;
    if (!appointment) {
        return next(new AppError("Appointment not found", 404));
    }

    // Start a transaction
    const localTransaction = await sequelize.transaction();

    try {
        // Validate `staffId` before proceeding
        if (!appointment.staffId) {
            return next(AppError("Staff ID is missing from the appointment", 400));
        }

        // Delete related appointment-services entries
        await appointmentServicesModel.destroy({
            where: { appointmentId: appointment.id },
            transaction: localTransaction,
        });

        // Delete Google Calendar event if it exists
        const staff = await staffModel.findByPk(appointment.staffId);
        const calendarId = staff?.calendarId;
        const auth = req.oauth2Client;

        if (calendarId && auth) {
            try {
                await deleteEvent(auth, calendarId, appointment.eventId);
            } catch (err) {
                console.error("Failed to delete Google Calendar event:", err.message);
                // Optionally continue without throwing an error
            }
        }

        // Delete the appointment itself
        await appointment.destroy({ transaction: localTransaction });

        // Commit the transaction
        await localTransaction.commit();

        // Send HTTP response
        return res.status(200).json({ message: "Appointment deleted successfully" });
    } catch (error) {
        // Rollback the transaction if any error occurs
        await localTransaction.rollback();
        return next(new AppError("Failed to delete the appointment", 500));
    }
};