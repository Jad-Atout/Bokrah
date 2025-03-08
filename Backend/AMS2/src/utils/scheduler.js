// scheduler.js
import schedule from "node-schedule";
import { sendEmail } from "./email.js";
import { appointmentFullDetailsEmail } from "./emailTemplete.js";
import scheduledReminder    from "../../DB/models/scheduledReminder.js";
export const scheduledRemindersMap = {};
//TODO Batching and delay for the sake of performance
//TODO schedule a job to change the appointment and event status after the completion of an appointment

export async function cancelScheduledReminders(appointmentId) {
    const jobs = scheduledRemindersMap[appointmentId];

    if (jobs && jobs.length > 0) {
        jobs.forEach(({ job }) => job.cancel()); // Cancel each scheduled job
    }

    delete scheduledRemindersMap[appointmentId]; // Remove from memory

    // 🔹 Remove from MongoDB
    await scheduledReminder.deleteMany({ appointmentId });
    console.log(`🛑 Canceled all reminders for appointment: ${appointmentId}`);
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

    for (const appointment of createdAppointments) {
        const apptId = appointment._id.toString();

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

            if (reminderDate > now) {
                console.log("   -> Scheduling this reminder...");

                // 🔹 Save to MongoDB
                const reminderDoc = await scheduledReminder.create({
                    appointmentId: apptId,
                    reminderTime: reminderDate,
                    method,
                    email,
                    userName,
                    staffNames,
                    allServices,
                    clientId,
                });

                // 🔹 Schedule in Node
                const job = schedule.scheduleJob(reminderDate, async () => {
                    console.log(`🔔 Sending ${method} reminder for appointment with earliest startTime at ${earliestStart}`);

                    if (method === "email") {
                        await sendEmail(
                            email,
                            "Appointment Reminder: Full Details",
                            await appointmentFullDetailsEmail(
                                userName,
                                staffNames,
                                allServices,
                                appointment.subAppointments,
                                apptId,
                                clientId
                            )
                        );
                    }

                    // 🔹 Mark as executed in DB
                    await scheduledReminder.findByIdAndUpdate(reminderDoc._id, { isExecuted: true });
                });

                // 🔹 Store in memory for quick cancellation
                scheduledRemindersMap[apptId].push({ job, reminderId: reminderDoc._id });
            } else {
                console.log(`❗ Skipped scheduling a reminder in the past:
           reminderDate local = ${reminderDate.toString()},
           reminderDate UTC   = ${reminderDate.toUTCString()}`);
            }
        }
    }
};

export async function reloadScheduledReminders() {
    const pendingReminders = await scheduledReminder.find({ isExecuted: false });

    pendingReminders.forEach((reminder) => {
        const { appointmentId, reminderTime, method, email, userName, staffNames, allServices, clientId, _id } = reminder;

        if (new Date(reminderTime) > new Date()) {
            console.log(`🔄 Reloading reminder for appointment ${appointmentId} at ${reminderTime}`);

            // Schedule again
            const job = schedule.scheduleJob(reminderTime, async () => {
                console.log(`🔔 Sending reloaded ${method} reminder for appointment ${appointmentId}`);

                if (method === "email") {
                    await sendEmail(
                        email,
                        "Appointment Reminder: Full Details",
                        await appointmentFullDetailsEmail(
                            userName,
                            staffNames,
                            allServices,
                            [],
                            appointmentId,
                            clientId
                        )
                    );
                }

                // Mark as executed in DB
                await scheduledReminder.findByIdAndUpdate(_id, { isExecuted: true });
            });

            // Store in memory
            if (!scheduledRemindersMap[appointmentId]) {
                scheduledRemindersMap[appointmentId] = [];
            }
            scheduledRemindersMap[appointmentId].push({ job, reminderId: _id });
        }
    });
}
