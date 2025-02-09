import {AppError} from "../../../utils/AppError.js";
import {sequelize} from "../../../../DB/connection.js";
import {Model as appointmentServicesModel} from "sequelize";
import {staffModel} from "../../../../DB/model/relations.js";
import deleteEvent from "../../../utils/google/eventCRUD/deleteEvent.js";

export const deleteAppointment = async (req, res, next, transaction = null) => {
    const appointment = req.appointment;
    if (!appointment) {
        return next(new AppError("Appointment not found", 404));
    }
    // Use existing transaction if provided, otherwise create a new one
    const localTransaction = transaction || (await sequelize.transaction());

    try {
        // Delete related appointment-services entries
        await appointmentServicesModel.destroy({
            where: { appointmentId: appointment.id},
            transaction: localTransaction
        });

        // Delete Google Calendar event if it exists
        const staff = await staffModel.findByPk(appointment.staffId);
        const calendarId = staff?.calendarId;
            const auth = req.oauth2Client;
            await deleteEvent(auth,calendarId,appointment.eventId)
        await appointment.destroy({ transaction: localTransaction });
        // Commit transaction if it was created here
        if (!transaction) await localTransaction.commit();
        // Send response only if it's a standalone call
        if (!transaction) {
            return res.status(200).json({ message: "Appointment deleted successfully" });
        }
    } catch (error) {
        // Rollback only if the transaction was created here
        if (!transaction) await localTransaction.rollback();
        return next(new AppError("Failed to delete appointment", 500));
    }
};
