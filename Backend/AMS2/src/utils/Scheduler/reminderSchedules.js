import AppointmentReminderJob from "../../../DB/models/appointmentReminderJob.js";
import {deleteJob, jobs, scheduleJob} from "./scheduler.js";
import {sendEmail} from "../email.js";
import {appointmentFullDetailsEmail} from "../emailTemplete.js";
import scheduledJob from "../../../DB/models/scheduledJob.js";
import {cancelScheduledSubAppointments, scheduleSubAppointments} from "./appointmentSchedules.js"; // Import scheduler functions
// the reminder is not created only the sub appointment
export async function scheduleReminders(appointment,auth, reminderData) {
    for (const subAppointment of appointment.subAppointments) {
        const { _id: subAppointmentId, staffId, services } = subAppointment;

        for (const reminder of reminderData) {
            const { minutes, email, userName, clientId } = reminder;
            const reminderTime = new Date(appointment.startTime);
            reminderTime.setMinutes(reminderTime.getMinutes() - minutes);

            if (reminderTime > new Date()) {
                await scheduleJob("appointmentReminder", subAppointmentId, reminderTime, async () => {
                    await sendEmail(
                        email,
                        "Appointment Reminder",
                        //TODO you cn send also an email fo the staff from here
                        await appointmentFullDetailsEmail(userName, [staffId], services, [], appointment._id, clientId)
                    );
                });
            }
        }
    }
    await scheduleSubAppointments(appointment,auth)
}


export async function handleAppointmentReminder(job) {
    console.log(`📢 Executing Reminder for Appointment: ${job.referenceId}`);
    const reminder = await AppointmentReminderJob.findOne({ appointmentId: job.referenceId });
    if (!reminder) {
        console.warn(`⚠️ Reminder not found for appointment: ${job.referenceId}`);
        return;
    }
    await sendEmail(reminder.email, "Appointment Reminder",
        await appointmentFullDetailsEmail(
            reminder.userName,
            reminder.staffNames,
            reminder.allServices,
            [],
            job.referenceId,
            reminder.clientId
        )
    );
}

export async function cancelReminders(appointmentId) {
    await cancelScheduledSubAppointments(appointmentId)
    const jobRecords = await scheduledJob.find({ referenceId:appointmentId });

    for (const job of jobRecords) {
        delete jobs[(await job)._id];
        await deleteJob(job._id);
    }

    console.log(`🛑 Canceled all reminders for appointment: ${appointmentId}`);
}

