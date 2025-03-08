import schedule from "node-schedule";
import { sendEmail } from "./email.js";
import { appointmentFullDetailsEmail } from "./emailTemplete.js";
import scheduledReminder from "../../DB/models/scheduledReminder.js";
import appointmentModel from "../../DB/models/appointment.js";
import staffModel from "../../DB/models/staff.js";
import deleteEvent from "./Google/events/deleteEvent.js";

export const scheduledRemindersMap = {};

// Cancel all scheduled jobs (in-memory + DB) for a given appointmentId
export async function cancelScheduledReminders(appointmentId) {
    const jobs = scheduledRemindersMap[appointmentId];

    if (Array.isArray(jobs) && jobs.length > 0) {
        jobs.forEach(({ job }) => job.cancel());
    }
    delete scheduledRemindersMap[appointmentId];

    // Remove from MongoDB
    await scheduledReminder.deleteMany({ appointmentId });
    console.log(`🛑 Canceled all reminders for appointment: ${appointmentId}`);
}


export const scheduleReminders = async (
    authClient,
    userName,
    createdAppointment,
    email,
    reminders,
    staffNames,
    allServices,
    clientId
) => {
    const now = new Date();



    const appointmentId = createdAppointment._id.toString();

    // Ensure we have a place to store in-memory jobs for this appointment
    if (!scheduledRemindersMap[appointmentId]) {
        scheduledRemindersMap[appointmentId] = [];
    }

    // 2) Find the earliest startTime among subAppointments
    //    (Or just use createdAppointment.startTime if you store it at the top level)
    let earliestStart = createdAppointment.subAppointments[0].startTime;
    for (const sub of createdAppointment.subAppointments) {
        if (sub.startTime < earliestStart) {
            earliestStart = sub.startTime;
        }
    }

    // 3) Schedule Reminders for the *main appointment*
    for (let i = 0; i < reminders.length; i++) {
        const { minutes, method } = reminders[i];

        const reminderDate = new Date(earliestStart);
        reminderDate.setMinutes(reminderDate.getMinutes() - minutes);

        if (isNaN(reminderDate)) {
            console.error("❌ Invalid date format for earliestStart:", earliestStart);
            continue;
        }

        // Only schedule if reminder time is in the future
        if (reminderDate > now) {
            console.log(`⏰ Scheduling reminder #${i} for appointment ${appointmentId} at ${reminderDate}`);

            // Create a DB record for the scheduled reminder
            const reminderDoc = new scheduledReminder({
                appointmentId: appointmentId,
                reminderTime: reminderDate,
                method,
                email,
                userName,
                staffNames,
                allServices,
                clientId,
            });
            await reminderDoc.save();

            // Schedule the job in memory
            const job = schedule.scheduleJob(reminderDate, async () => {
                console.log(`🔔 Sending ${method} reminder for appointment ${appointmentId}`);

                if (method === "email") {
                    await sendEmail(
                        email,
                        "Appointment Reminder: Full Details",
                        await appointmentFullDetailsEmail(
                            userName,
                            staffNames,
                            allServices,
                            createdAppointment.subAppointments, // pass the subAppointments array
                            appointmentId,
                            clientId
                        )
                    );
                }

                // Mark this reminder doc as executed
                await scheduledReminder.findByIdAndUpdate(reminderDoc._id, { isExecuted: true });
            });

            // Store reference in scheduledRemindersMap
            scheduledRemindersMap[appointmentId].push({ job, reminderId: reminderDoc._id });
        } else {
            console.log(`❗ Skipped scheduling a reminder in the past: ${reminderDate}`);
        }
    }

    // 4) Schedule End Time Jobs for *each* sub-appointment
    for (const subAppt of createdAppointment.subAppointments) {
        const subApptId = subAppt._id.toString();
        const endTime = new Date(subAppt.endTime);

        if (endTime > now) {
            console.log(`⏳ Scheduling completion job for sub-appointment ${subApptId} at ${endTime}`);

            // We store each sub-appointment job in the same map or a separate one
            const completeJob = schedule.scheduleJob(endTime, async () => {
                console.log(`✅ Marking sub-appointment ${subApptId} as completed`);

                // Update sub-appointment status to "completed"
                await appointmentModel.updateOne(
                    { "subAppointments._id": subApptId },
                    { $set: { "subAppointments.$.status": "completed" } }
                );

                // Attempt to remove the event from Google Calendar
                try {
                    const staffMember = await staffModel.findById(subAppt.staffId);
                    if (!staffMember || !staffMember.calendarId) {
                        console.error(`⚠ No calendarId found for staff ${subAppt.staffId}`);
                    } else {
                        // subAppt might store a googleEventId or eventId
                        // adapt if your field is named differently
                        await deleteEvent(authClient, staffMember.calendarId, subAppt.googleEventId);
                        console.log(`🗑 Deleted Google Calendar event for sub-appointment ${subApptId}`);
                    }
                } catch (err) {
                    console.error(`❌ Failed to fetch staff or delete event for ${subApptId}:`, err);
                }

                // Check if *all* subAppointments are completed
                const updatedAppointment = await appointmentModel.findById(createdAppointment._id);
                if (updatedAppointment.subAppointments.every(s => s.status === "completed")) {
                    console.log(
                        `✅ All sub-appointments completed, marking main appointment ${createdAppointment._id} as done`
                    );
                    await appointmentModel.updateOne(
                        { _id: createdAppointment._id },
                        { $set: { status: "done" } }
                    );
                }
            });

            // Optionally store this job
            scheduledRemindersMap[subApptId] = completeJob;
        } else {
            console.log(`⚠ Skipped scheduling completion job for past sub-appointment: ${subApptId}`);
        }
    }
};

/**
 * Reload scheduled reminders from DB on server startup (optional)
 * This ensures persistent scheduling if the server restarts.
 */
export async function reloadScheduledReminders() {
    const pendingReminders = await scheduledReminder.find({ isExecuted: false });

    pendingReminders.forEach((reminder) => {
        const {
            appointmentId,
            reminderTime,
            method,
            email,
            userName,
            staffNames,
            allServices,
            clientId,
            _id
        } = reminder;

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
                            [], // we don't have subAppointments here, you may re-fetch them if needed
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
