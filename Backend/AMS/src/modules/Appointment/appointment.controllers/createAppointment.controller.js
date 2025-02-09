import { AppError } from "../../../utils/AppError.js";
import { sequelize } from "../../../../DB/connection.js";
import appointmentModel from "../../../../DB/model/appointment.js";
import { AppointmentService } from "../../../../DB/model/relations.js";
import createCalendarEvent from "../../../utils/google/eventCRUD/createEvent.js";
import { checkGoogleCalendarAvailability } from "../../../utils/google/checkAvailability.js";

/**
 * Controller function to create a new appointment and corresponding Google Calendar event.
 * It checks availability of the selected time slot, calculates the end time based on service durations,
 * creates the appointment in the database, and adds the event to the client's Google Calendar.
 * If a transaction is provided, it will be used; otherwise, a new transaction will be created.
 *
 * @param {Object} req - The request object, containing appointment details.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function to handle errors.
 * @param {Object} [transaction=null] - Optional transaction object to be used for the appointment creation.
 * @returns {Promise<Object>} - The newly created appointment and event.
 */
export const createAppointment = async (req, res, next, transaction = null) => {
    const { startTime, services, customerId, staffId } = req.body;
    const clientId = req.params.id;
    const status = "Booked";

    if (!services || !Array.isArray(services) || services.length === 0) {
        return next(new AppError("Services are required to calculate end time", 400));
    }
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
