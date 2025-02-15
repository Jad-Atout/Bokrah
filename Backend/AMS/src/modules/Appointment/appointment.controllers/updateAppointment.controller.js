import {AppError} from "../../../utils/AppError.js";
import sequelize from "../../../../DB/connection.js";
import {deleteAppointment} from "./deleteAppointment.controller.js";
import {calculateEndTime, createAppointment} from "./createAppointment.controller.js";
import {checkGoogleCalendarAvailability} from "../../../utils/Google/Services/checkAvailability.js";
import {AppointmentService, staffModel} from "../../../../DB/model/relations.js";
import createCalendarEvent from "../../../utils/Google/Events.Controller/createEvent.js";
import _ from "lodash";
import {updateCalendarEvent} from "../../../utils/Google/Events.Controller/updateEvent.js";
import req from "express/lib/request.js";

// export const updateAppointment = async (req, res, next) => {
//     const appointment = req.appointment;
//     const { startTime, services, staffId } = req.body;
//     const clientId = req.params.id;
//
//     if (!appointment) {
//         return next(new AppError("Appointment not found", 404));
//     }
//
//     if (services && (!Array.isArray(services) || services.length === 0)) {
//         return next(new AppError("Valid services are required to update the appointment", 400));
//     }
//
//     // Start a new Sequelize transaction to ensure atomicity.
//     const transaction = await sequelize.transaction();
//
//     try {
//         // Step 1: Delete the old appointment (including services and Google event)
//         await deleteAppointment(req, res, next, transaction);
//
//         // Step 2: Create a new appointment with the updated data
//         const newAppointmentData = {
//             startTime,
//             services,
//             staffId,
//             customerId: appointment.customerId, // Keep the original customer
//             status: 'Booked', // Assuming you want to set the status to 'Booked' when updating
//         };
//
//         const newAppointment = await createAppointment(req, res, next, transaction, newAppointmentData);
//
//         // Commit the transaction
//         await transaction.commit();
//
//         return res.status(200).json({
//             message: "Appointment updated successfully",
//             newAppointment,
//         });
//
//     } catch (error) {
//         // Rollback the transaction if any error occurred
//         await transaction.rollback();
//         return next(new AppError("Failed to update appointment", 500));
//     }
// };


export const updateAppointment = async (req, res, next) => {
    const appointment = req.appointment;
    if (!appointment) {
        return next(new AppError("Appointment not found", 404));
    }
    const { startTime, staffId } = req.body;
    const { services } = req.services;
    const allowedUserFields = ["startTime", "services", "staffId"];
    let updateData = {}
    updateData  = _.pickBy(_.pick(req.body, allowedUserFields), _.identity);
    updateData.status = 'Booked';

    // Start a new Sequelize transaction to ensure atomicity.
    const transaction = await sequelize.transaction();

    try {
        // Step 1: Verify if the new time slot is available
        const auth = req.oauth2Client;
        const endTime = calculateEndTime(startTime, services);
        const isAvailable = await checkGoogleCalendarAvailability(auth, staffId, startTime, endTime);
        if (!isAvailable) {
            return next(new AppError("The selected time slot is unavailable", 400));
        }
        const updatedAppointment = await appointment.update(updateData, { transaction });
        // Step 4: Conditionally update services associated with the appointment
        if (services) {
            const appointmentServicesData = services.map(serviceId => ({
                appointmentId: updatedAppointment.id,
                serviceId,
            }));
            await AppointmentService.bulkCreate(appointmentServicesData, { transaction });
        }

        // Step 5: Update the Google Calendar event
        const staff = await staffModel.findByPk(staffId)
        const calendarId = staff.calendarId;
        const updatedEventData = {newStartTime:startTime, newEndTime:endTime}
        const event = await updateCalendarEvent(auth,updatedAppointment.eventId,calendarId,updatedEventData)

        // Commit the transaction
        await transaction.commit();
        return res.status(200).json({
            message: "Appointment updated successfully",
            updatedAppointment,
            event,
        });
    } catch (error) {
        // Rollback the transaction if any error occurred
        await transaction.rollback();
        return next(new AppError("Failed to update appointment", 500));
    }
};
