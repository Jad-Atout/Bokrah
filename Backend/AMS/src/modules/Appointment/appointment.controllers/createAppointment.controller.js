import { AppError } from "../../../utils/AppError.js";
import sequelize  from "../../../../DB/connection.js";
import appointmentModel from "../../../../DB/model/appointment.js";
import {AppointmentService, staffModel} from "../../../../DB/model/relations.js";
import createCalendarEvent from "../../../utils/Google/Events.Controller/createEvent.js";
import { checkGoogleCalendarAvailability } from "../../../utils/Google/Services/checkAvailability.js";





const prepareAppointmentData = (authClient, startTime, services) => {
    if (!authClient) {
        throw new AppError("Google authentication credentials not provided", 401);
    }
    return calculateEndTime(startTime, services);
};




/**
 * Asynchronously creates a new appointment and adds its associated event to a calendar.
 *
 * This function handles the complete appointment creation workflow, including:
 * - Validating provided services and appointment data.
 * - Checking staff availability via Google Calendar.
 * - Creating the appointment record in the database.
 * - Associating the selected services with the appointment.
 * - Adding the appointment as an event in the staff's Google Calendar.
 * - Managing transactional operations to ensure data consistency.
 *
 * If any failures occur during the process, the transaction is rolled back and an error is propagated.
 *
 * @async
 * @function createAppointment
 * @param {Object} req - The HTTP request object, containing the necessary data for appointment creation.
 * @param {Object} req.body - The request body, containing the appointment details.
 * @param {string} req.body.startTime - The start time of the appointment.
 * @param {string} req.body.customerId - The ID of the customer creating the appointment.
 * @param {string} req.body.staffId - The ID of the staff assigned to the appointment.
 * @param {Array<Object>} req.body.services - An array of service objects relevant to the appointment.
 * @param {Object} req.params - The request parameters, including client-specific identifiers.
 * @param {string} req.params.clientId - The ID of the client associated with the appointment.
 * @param {Object} req.oauth2Client - The OAuth2 client for Google Calendar API interactions.
 * @param {Object} req.services - The services to be attached to the appointment.
 * @param {Object} res - The HTTP response object, used to send the success response.
 * @param {Function} next - The middleware function for handling errors or continuing the request-response cycle.
 * @throws {AppError} Throws an error if any issues occur during the process, such as invalid input data, unavailable time slots, or failure to create records.
 */
export const createAppointment = async (req, res, next) => {
    const { startTime, customerId, staffId } = req.body;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;
    const services = req.services;
    const transaction = await sequelize.transaction();
    const APPOINTMENT_STATUS = "Booked";

    try {
        if (!Array.isArray(services) || services.length === 0) {
           return next( new AppError("No valid services were provided for the appointment", 400));
        }

        const endTime = prepareAppointmentData( authClient,startTime, services,);

        // Check staff availability
        const isAvailable = await checkGoogleCalendarAvailability(authClient, staffId, startTime, endTime);
        if (!isAvailable) {
            await transaction.rollback();
            return next(new AppError("The selected time slot is unavailable", 400));
        }
        const appointment = await appointmentModel.create(
            { startTime, endTime, status: APPOINTMENT_STATUS, staffId, clientId, customerId },
            { transaction }
        );
        const appointmentServicesData = services.map(service => ({
            appointmentId: appointment.id,
            serviceId: service.id,
        }));
        await AppointmentService.bulkCreate(appointmentServicesData, { transaction });


        const {CalendarId} = await staffModel.findOne({where:{
            id:staffId
            }})

        const event = await createCalendarEvent(authClient, appointment,services,CalendarId);
        await appointment.update({ eventId: event.id }, { transaction });

        // Commit transaction and send success response
        await transaction.commit();
        return res.status(201).json({
            message: "Appointment and calendar event created successfully",
            appointment,
            event,
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Error creating appointment and calendar event:", error);
        return next(new AppError(`Failed to create appointment and calendar event: ${error.message}`, 500));
    }
};

/**
 * Calculates the end time based on the provided start time and the durations of a list of services.
 *
 * @param {Date|string} startTime - The starting time as a Date object or a string that can be parsed into a Date.
 * @param {Array.<{duration: number}>} services - An array of objects where each object contains a `duration` (in minutes).
 * @returns {string} The calculated end time as an ISO 8601 formatted string.
 */
export const calculateEndTime = (startTime, services) => {
    let totalDuration = 0;
    services.forEach((service) => {
        totalDuration += service.duration;
    });
    const startDate = (startTime instanceof Date) ? startTime : new Date(startTime);
    const endTime = new Date(startDate.getTime() + totalDuration * 60000);
    return endTime.toISOString();
};
