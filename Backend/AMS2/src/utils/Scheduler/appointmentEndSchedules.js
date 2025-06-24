import deleteEvent from "../Google/events/deleteEvent.js";
import { deleteJob, jobs, scheduleJob } from "./scheduler.js";
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
    try {
        const appointment = await appointmentModel
            .findById(appointmentId)
            .populate([
                {
                    path: 'subAppointments',
                    populate: {
                        path: 'staffId',
                        select: 'calendarId'
                    }
                }
            ])
            .exec();
        if (appointment) {
        } else {
            console.warn(`⚠️ Appointment not found for ID: ${appointmentId}`);
        }
        return appointment;
    } catch (error) {
        console.error(`❌ Error fetching appointment data for ID ${appointmentId}:`, error);
        throw error;
    }
};

/**
 * Simulates an HTTP request to prepare authentication.
 * @param {string} clientId - The client ID
 */
const prepareAuth = async (clientId) => {
    console.log(`🔑 Preparing authentication for client ID: ${clientId}`);
    const req = { authUser: { clientId }, params: {} };
    const res = {};
    const next = (err) => {
        if (err) console.error("❌ prepareAuth error:", err);
        auth = req.oauth2Client;
    };
    const middleware = prepareToken();
    try {
        await middleware(req, res, next);
        console.log(`✅ Authentication prepared for client ID: ${clientId}`);
    } catch (err) {
        console.error(`❌ Error in authentication middleware:`, err);
        throw err;
    }
};

/**
 * Deletes a sub-appointment's event from Google Calendar and updates the database.
 * @param {string} subAppointmentId - The sub-appointment ID
 * @param {object} appointment - The parent appointment object
 */
const deleteSubAppointmentEvent = async (subAppointmentId, appointment) => {
    console.log(`🗑️ Deleting sub-appointment event. SubAppointmentID: ${subAppointmentId}`);
    const subAppointment = appointment.subAppointments.find(
        (sub) => sub._id.toString() === subAppointmentId
    );
    if (!subAppointment) {
        console.warn(`⚠️ Sub-appointment ID ${subAppointmentId} not found in appointment ${appointment._id}`);
        return;
    }
    try {
        await prepareAuth(appointment.clientId);
        console.log(`🔑 Auth obtained. Calling deleteEvent for event ID: ${subAppointment.eventId}`);
        await deleteEvent(auth, subAppointment.staffId.calendarId, subAppointment.eventId);
        console.log(`✅ deleteEvent completed for event ID: ${subAppointment.eventId}`);

        subAppointment.status = "completed";
        await appointment.save();
        console.log(`💾 Sub-appointment ${subAppointmentId} marked as completed and saved.`);

        // If all sub-appointments are completed, mark the appointment as completed
        const isLastSubAppointment = appointment.subAppointments.every(
            (sub) => sub.status === "completed"
        );
        if (isLastSubAppointment) {
            appointment.status = "completed";
            await appointment.save();
            console.log(`✅ All sub-appointments completed for appointment ${appointment._id}.`);
        }
    } catch (error) {
        console.error(
            `❌ Error deleting sub-appointment event for ID ${subAppointmentId}:`,
            error
        );
        throw error;
    }
};

/**
 * Schedule sub-appointments for an appointment.
 * @param {string} appointmentId - The appointment ID
 */
export async function scheduleSubAppointments(appointmentId) {
    const appointment = await getAppointmentData(appointmentId);
    if (!appointment) {
        console.warn(`⚠️ Appointment not found: ${appointmentId}. No sub-appointments scheduled.`);
        return;
    }

    for (const subAppointment of appointment.subAppointments) {
        await scheduleJob(
            "subAppointmentEnd",
            subAppointment._id,
            subAppointment.endTime,
            async () => await deleteSubAppointmentEvent(subAppointment._id.toString(), appointment)
        );
    }
    console.log(`✅ Scheduled ${appointment.subAppointments.length} sub-appointments.`);
}

/**
 * Fetches an appointment using a sub-appointment ID.
 * @param {string} subAppointmentId - The sub-appointment ID
 * @returns {object|null} - The appointment object or null if not found
 */
const getAppointmentBySubAppointmentId = async (subAppointmentId) => {
    try {
        const appointment = await appointmentModel
            .findOne({ "subAppointments._id": subAppointmentId })
            .populate([
                {
                    path: 'subAppointments',
                    populate: {
                        path: 'staffId',
                        select: 'calendarId'
                    }
                }
            ])
            .exec();
        if (appointment) {
            console.log(`✅ Appointment fetched for sub-appointment ID: ${subAppointmentId}`);
        } else {
            console.warn(`⚠️ No appointment found for sub-appointment ID: ${subAppointmentId}`);
        }
        return appointment;
    } catch (error) {
        console.error(
            `❌ Error fetching appointment by sub-appointment ID ${subAppointmentId}:`,
            error
        );
        throw error;
    }
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
        console.error(`❌ Error handling sub-appointment completion:`, error);
    }
}

/**
 * Cancel all scheduled sub-appointments for an appointment.
 * @param {string} appointmentId - The appointment ID
 */
export async function cancelScheduledSubAppointments(appointmentId) {
    console.log(`🚫 Cancelling scheduled sub-appointments for appointment ID: ${appointmentId}`);
    const appointment = await getAppointmentData(appointmentId);
    if (!appointment) {
        console.warn(`⚠️ Appointment not found: ${appointmentId}. No scheduled sub-appointments to cancel.`);
        return;
    }

    for (const subAppointment of appointment.subAppointments) {
        console.log(`🗑️ Cancelling jobs for sub-appointment ID: ${subAppointment._id}`);
        const jobsToDelete = await scheduledJob.find({ referenceId: subAppointment._id });
        for (const job of jobsToDelete) {
            console.log(`🗑️ Deleting job with ID: ${job._id} for sub-appointment ${subAppointment._id}`);
            await deleteJob(job._id);
        }
    }

    console.log(`🛑 Canceled all scheduled sub-appointments for appointment: ${appointmentId}`);
}



export async function cancelSubAppointmentTasks(subAppointmentId) {
    try {
        const jobsToDelete = await scheduledJob
            .find({ referenceId: subAppointmentId })
            .exec();

        await Promise.all(
            jobsToDelete.map(({ _id }) => {
                console.log(`🗑️ Deleting job ${_id} for sub-appointment ${subAppointmentId}`);
                return deleteJob(_id);
            })
        );
    } catch (err) {
    }
}
