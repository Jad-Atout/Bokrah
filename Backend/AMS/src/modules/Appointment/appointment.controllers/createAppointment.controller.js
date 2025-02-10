import { AppError } from "../../../utils/AppError.js";
import sequelize  from "../../../../DB/connection.js";
import appointmentModel from "../../../../DB/model/appointment.js";
import { AppointmentService } from "../../../../DB/model/relations.js";
import createCalendarEvent from "../../../utils/google/eventCRUD/createEvent.js";
import { checkGoogleCalendarAvailability } from "../../../utils/google/checkAvailability.js";


/**
 * Asynchronously creates a new appointment and corresponding Google Calendar event.
 * Handles the creation of an appointment, associates services with the appointment,
 * and ensures synchronization with a staff member's Google Calendar.
 *
 * @param {Object} req - The request object containing the appointment details.
 * @param {Object} req.body - The body of the request containing appointment data.
 * @param {Date} req.body.startTime - The start time of the appointment.
 * @param {Array<number>} req.body.services - An array of service IDs associated with the appointment.
 * @param {number} req.body.customerId - The ID of the customer booking the appointment.
 * @param {number} req.body.staffId - The ID of the staff member for the appointment.
 * @param {Object} req.oauth2Client - The OAuth2 client for Google Calendar API authentication.
 * @param {Object} res - The response object to send feedback to the client.
 * @param {Function} next - The next middleware function in the chain for handling errors.
 * @param {Object|null} [transaction=null] - An optional transaction instance for database operations.
 * @param {number} req.params - The ID of the client for the appointment.
 *
 * @throws {AppError} Throws an error if Google authentication is missing or if the time slot is unavailable.
 * @throws {AppError} Throws an error if the appointment or calendar event creation fails.
 *
 * @returns {Promise<Object|void>} Returns the created appointment object if `transaction` is provided;
 * otherwise, sends a JSON response to the client with the created appointment and Google Calendar event.
 */
export const createAppointment = async (req, res, next, transaction = null) => {
    const { startTime, services, customerId, staffId } = req.body;
    const {clientId} = req.params;
    const status = "Booked";
    const auth = req.oauth2Client;

    if (!auth) {
        return next(new AppError("Google authentication credentials not provided", 401));
    }
    const endTime = calculateEndTime(startTime, services);

    const localTransaction = transaction || (await sequelize.transaction());

    try {
        const isAvailable = await checkGoogleCalendarAvailability(auth, staffId, startTime, endTime);
        if (!isAvailable) {
            return next(new AppError("The selected time slot is unavailable", 400));
        }
        const appointment = await appointmentModel.create(
            { startTime, endTime, status, staffId, clientId, customerId },
            { transaction: localTransaction }
        );

        const appointmentServicesData = services.map(serviceId => ({
            appointmentId: appointment.id,
            serviceId,
        }));
        await AppointmentService.bulkCreate(appointmentServicesData, { transaction: localTransaction });
        const event = await createCalendarEvent(auth, appointment);
        await appointment.update({ eventId: event.id }, { transaction: localTransaction });
        if (!transaction) await localTransaction.commit();
        if (!transaction) {
            return res.status(201).json({
                message: "Appointment and calendar event created successfully",
                appointment,
                event,
            });
        }
        return appointment;
    } catch (error) {
        if (!transaction) await localTransaction.rollback();
        return next(new AppError("Failed to create appointment and calendar event", 500));
    }
};

/**
 * Helper function to calculate the end time of the appointment based on the service durations.
 *
 * @param {Date} startTime - The start time of the appointment.
 * @param {Array} services - List of services, each with a duration property.
 * @returns {Date} - The calculated end time.
 */
export const calculateEndTime = (startTime, services) => {
    if (!services || services.length === 0) {
        return startTime;
    }
    const totalDuration = services.reduce((acc, service) => acc + service.duration, 0);
    return new Date(new Date(startTime).getTime() + totalDuration * 60000);
};
