// scheduler.js
import schedule from "node-schedule";
import { sendEmail } from "./email.js";
import { appointmentFullDetailsEmail } from "./emailTemplete.js";

export const scheduledRemindersMap = {};


export function cancelScheduledReminders(appointmentId) {
    const jobs = scheduledRemindersMap[appointmentId];
    if (jobs && jobs.length > 0) {
        jobs.forEach(job => job.cancel()); // cancel each scheduled job
    }
    delete scheduledRemindersMap[appointmentId]; // remove from the map
}


export const scheduleReminders = async (
    userName,
    createdAppointments,
    email,
    reminders,
    staffNames,
    allServices,
    appointmentId,
    clientId
) => {
    if (!Array.isArray(createdAppointments) || createdAppointments.length === 0) {
        return;
    }

    const now = new Date();
    console.log("------------------------------");
    console.log("Server local now:", now.toString()); // Local time
    console.log("Server UTC now:  ", now.toUTCString()); // UTC
    console.log("------------------------------");

    for (const appointment of createdAppointments) {
        const apptId = appointment._id.toString();
        console.log("🔍 Checking appointment:", appointment);

        if (!Array.isArray(appointment.subAppointments) || appointment.subAppointments.length === 0) {
            console.error("❌ No subAppointments found:", appointment);
            continue;
        }

        if (!scheduledRemindersMap[apptId]) {
            scheduledRemindersMap[apptId] = [];
        }

        for (let i = 0; i < reminders.length; i++) {
            const { minutes, method } = reminders[i];
            const earliestStart = appointment.subAppointments[0].startTime;

            const reminderDate = new Date(earliestStart);
            reminderDate.setMinutes(reminderDate.getMinutes() - minutes);

            if (isNaN(reminderDate)) {
                console.error("❌ Invalid date format for startTime:", earliestStart);
                continue;
            }

            console.log(`⏰ Reminder #${i} for appointment at:`);
            console.log("   - reminderDate local:", reminderDate.toString());
            console.log("   - reminderDate UTC:  ", reminderDate.toUTCString());
            console.log("   - offset (minutes):  ", minutes);

            // Only schedule if in the future
            if (reminderDate > now) {
                console.log("   -> Scheduling this reminder...");
                // Schedule the job
                const job = schedule.scheduleJob(reminderDate, async () => {
                    console.log(
                        `🔔 Sending ${method} reminder for appointment with earliest startTime at ${earliestStart}`
                    );

                    if (method === "email") {
                        await sendEmail(
                            email,
                            "Appointment Reminder: Full Details",
                            await appointmentFullDetailsEmail(
                                userName,
                                staffNames,
                                allServices,
                                appointment.subAppointments, // pass the entire subAppointments array
                                apptId,
                                clientId
                            )
                        );
                    }
                });

                // Store the job reference so we can cancel later
                scheduledRemindersMap[apptId].push(job);

            } else {
                console.log(
                    `❗ Skipped scheduling a reminder in the past:
           reminderDate local = ${reminderDate.toString()},
           reminderDate UTC   = ${reminderDate.toUTCString()}`
                );
            }
        }
    }
};
