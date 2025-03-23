import deleteEvent from "../Google/events/deleteEvent.js";
import {deleteJob, jobs, scheduleJob} from "./scheduler.js";
import scheduledJob from "../../../DB/models/scheduledJob.js";
import appointmentModel from "../../../DB/models/appointment.js";
import prepareToken from "../Google/Services/refreshToken.js";

let auth;

/**
 * Fetches appointment details with populated sub-appointments and staff data.
 * @param {string} appointmentId - The appointment ID
 * @returns {object|null} - The populated appointment object or null if not found
 */
const getAppointmentData = async (appointmentId) => {
    return await appointmentModel.findById(appointmentId).populate([
        {
            path: 'subAppointments',
            populate: {
                path: 'staffId',
                select: 'calendarId'
            }
        }
    ]).exec();
};

/**
 * Simulates an HTTP request to prepare authentication.
 * @param {string} clientId - The client ID
 */
const prepareAuth = async (clientId) => {
    const req = { authUser: { clientId }, params: {} };
    const res = {};
    const next = (err) => {
        if (err) console.error("Error:", err);
        auth = req.oauth2Client;
    };
    const middleware = prepareToken();
    await middleware(req, res, next);
};

/**
 * Deletes a sub-appointment's event from Google Calendar and updates the database.
 * @param {string} subAppointmentId - The sub-appointment ID
 * @param {object} appointment - The parent appointment object
 */
const deleteSubAppointmentEvent = async (subAppointmentId, appointment) => {
    const subAppointment = appointment.subAppointments.find(sub => sub._id.toString() === subAppointmentId);
    if (!subAppointment) return;

    await prepareAuth(appointment.clientId);
    await deleteEvent(auth, subAppointment.staffId.calendarId, subAppointment.eventId);

    subAppointment.status = "completed";
    await appointment.save();

    // If all sub-appointments are completed, mark the appointment as completed
    const isLastSubAppointment = appointment.subAppointments.every(sub => sub.status === "completed");
    if (isLastSubAppointment) {
        appointment.status = "completed";
        await appointment.save();
        console.log(`✅ All sub-appointments completed for appointment ${appointment._id}.`);
    }
};

/**
 * Schedule sub-appointments for an appointment.
 * @param {string} appointmentId - The appointment ID
 */
export async function scheduleSubAppointments(appointmentId) {
    const appointment = await getAppointmentData(appointmentId);
    if (!appointment) return;

    for (const subAppointment of appointment.subAppointments) {
        await scheduleJob(
            "subAppointmentEnd",
            subAppointment._id,
            subAppointment.endTime,
            async () => await deleteSubAppointmentEvent(subAppointment._id, appointmentId)
        );
    }
}


/**
 * Fetches an appointment using a sub-appointment ID.
 * @param {string} subAppointmentId - The sub-appointment ID
 * @returns {object|null} - The appointment object or null if not found
 */
const getAppointmentBySubAppointmentId = async (subAppointmentId) => {
    return await appointmentModel.findOne({ "subAppointments._id": subAppointmentId }).populate([
        {
            path: 'subAppointments',
            populate: {
                path: 'staffId',
                select: 'calendarId'
            }
        }
    ]).exec();
};

/**
 * Handles the completion of a sub-appointment.
 * @param {object} job - The job data containing the sub-appointment ID
 */
export async function handleAppointmentStatus(job) {
    try {
        console.log(`⏳ Processing sub-appointment completion for: ${job.referenceId}`);
        const subAppointmentId = job.referenceId;

        // Fetch the appointment using the sub-appointment ID
        const appointment = await getAppointmentBySubAppointmentId(subAppointmentId);
        if (!appointment) {
            console.error(`❌ Appointment not found for sub-appointment ID: ${subAppointmentId}`);
            return;
        }

        await deleteSubAppointmentEvent(subAppointmentId, appointment);
    } catch (error) {
        console.error(`❌ Error handling sub-appointment completion: ${error}`);
    }
}

/**
 * Cancel all scheduled sub-appointments for an appointment.
 * @param {string} appointmentId - The appointment ID
 */
export async function cancelScheduledSubAppointments(appointmentId) {
    const appointment = await getAppointmentData(appointmentId);
    if (!appointment) return;

    for (const subAppointment of appointment.subAppointments) {
        const jobsToDelete = await scheduledJob.find({referenceId: subAppointment._id});
        for (const job of jobsToDelete) {
            await deleteJob(job._id);
        }


        console.log(`🛑 Canceled all scheduled sub-appointments for appointment: ${appointmentId}`);
    }
}
