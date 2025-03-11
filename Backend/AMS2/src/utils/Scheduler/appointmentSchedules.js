import staffModel from "../../../DB/models/staff.js";
import deleteEvent from "../Google/events/deleteEvent.js";
import {deleteJob, scheduleJob} from "./scheduler.js";
import appointmentModel from "../../../DB/models/appointment.js";

export async function scheduleSubAppointments(appointment, auth) {
    const subAppointments = appointment.subAppointments;

    for (const subAppointment of subAppointments) {
        const { calendarId } = await staffModel.findById(subAppointment.staffId);

        await scheduleJob("subAppointmentEnd", subAppointment._id, subAppointment.endTime,
            async () => await handleAppointmentStatus(auth, calendarId, subAppointment, appointment))

        }

    }

export const handleAppointmentStatus = async (auth, calendarId, subAppointment, appointment) => {
        await deleteEvent(auth, calendarId, subAppointment.eventId);
        subAppointment.status = "completed";
        await subAppointment.save();
        const isLastSubAppointment = appointment.subAppointments.every(sub => sub.status === "completed");
        if (isLastSubAppointment) {
            appointment.status = "completed";
            await appointment.save();
            console.log(`✅ All sub-appointments completed for appointment ${appointment._id}. Appointment status updated to completed.`);
        }
};

export async function cancelScheduledSubAppointments(appointmentId) {
    const appointment = await appointmentModel.findById(appointmentId);
    for (const subAppointment of appointment.subAppointments) {
        const jobs = await scheduleJob.find({ referenceId: subAppointment._id });
        for (const job of jobs) {
            await deleteJob(job._id);
        }
    }
}
