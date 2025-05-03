import { deleteJob, jobs, scheduleJob } from "./scheduler.js";
import { sendEmail } from "../email.js";
import { appointmentFullDetailsEmail } from "../emailTemplete.js";
import scheduledJob from "../../../DB/models/scheduledJob.js";
import Service from "../../../DB/models/service.js";
import Customer from "../../../DB/models/customer.js";
import User from "../../../DB/models/user.js";
import Staff from "../../../DB/models/staff.js";
import appointmentModel from "../../../DB/models/appointment.js";
import { cancelScheduledSubAppointments, scheduleSubAppointments } from "./appointmentEndSchedules.js";
import reminderModel from "../../../DB/models/reminder.js";
import UserNotificationPreference from "../../../DB/models/notifications/UserNotificationPreference.js";

// Fetch reminder settings for the client
const getReminder = async (clientId) => {
    const reminder = await reminderModel.findOne({ clientId });

    if (!reminder || !Array.isArray(reminder.reminderTimes) || reminder.reminderTimes.length === 0) {
        return [{ method: "email", minutes: 60 }];
    }

    const methods = reminder.reminderMethods?.length
        ? reminder.reminderMethods
        : ["email"];

    return reminder.reminderTimes.map((time, index) => ({
        minutes: Number.isFinite(time) ? time : 60,
        method: methods[index % methods.length]
    }));
};


// Get appointment data for reminders
const getAppointmentData = async (appointmentId) => {
    const appointmentData = await appointmentModel.findById(appointmentId).populate([
        {
            path: 'subAppointments',
            populate: [
                {
                    path: 'staffId',
                    populate: {
                        path: 'userId',
                        select: 'userName'
                    }
                },
                {
                    path: 'services._id',
                    model: 'Service',
                    select: 'serviceName'
                }
            ]
        },
        {
            path: 'customerId',
            populate: {
                path: 'userId',
            }
        }
    ]).exec();

    const staffNames = appointmentData.subAppointments.map(subAppointment =>
        subAppointment.staffId.userId.userName
    );

    const serviceNames = appointmentData.subAppointments.flatMap(subApp =>
        subApp.services.map(s => s._id.serviceName)
    );

    return {
        staffNames,
        serviceNames,
        customerName: appointmentData.customerId.userId.userName,
        customerEmail: appointmentData.customerId.userId.email,
        appointmentData
    };
};

// Shared function to send reminder email
const sendAppointmentReminder = async (
    appointmentData,
    customerEmail,
    customerName,
    staffNames,
    serviceNames,
    appointmentId,
    scheduledTime
) => {
    if (scheduledTime <= new Date()) return;

    const userId = appointmentData.customerId.userId._id;
    const preferences = await UserNotificationPreference.findOne({ userId });

    const reminderPrefs = preferences?.preferences?.Appointment?.reminderChannels || {
        email: true,
        sms: true,
        push: true,
    };

    // 📨 Email Reminder
    //if (reminderPrefs.email) {
        await scheduleJob("appointmentReminder", appointmentId, scheduledTime, async () => {
            await sendEmail(
                customerEmail,
                "Appointment Reminder",
                await appointmentFullDetailsEmail(
                    customerName,
                    staffNames,
                    serviceNames,
                    appointmentData.subAppointments,
                    appointmentId,
                    appointmentData.clientId
                )
            );
        });
    // if (reminderPrefs.sms && appointmentData.customerId.userId.phoneNumber) {
    //     await scheduleJob("appointmentReminder-sms", appointmentId, scheduledTime, async () => {
    //         // await sendSMS(...)
    //     });
    // }
    //
    // // 🔔 Push
    // if (reminderPrefs.push) {
    //     await scheduleJob("appointmentReminder-push", appointmentId, scheduledTime, async () => {
    //         // await sendPushNotification(...)
    //     });
    // }
};

// Schedule reminders
export async function scheduleReminders(appointmentId) {
    const { staffNames, serviceNames, customerName, customerEmail, appointmentData } = await getAppointmentData(appointmentId);
    const reminderData = await getReminder(appointmentData.clientId);

    for (const reminder of reminderData) {
        const reminderTime = new Date(appointmentData.subAppointments[0].startTime);
        reminderTime.setMinutes(reminderTime.getMinutes() - reminder.minutes);
        await sendAppointmentReminder(appointmentData, customerEmail, customerName, staffNames, serviceNames, appointmentId, reminderTime);
    }

    await scheduleSubAppointments(appointmentData);
}

// Handle executing a scheduled reminder
//TODO enhance this one also
export async function handleAppointmentReminder(job) {
    try {
        console.log(`📢 Executing Reminder for Appointment: ${job.referenceId}`);
        const { staffNames, serviceNames, customerName, customerEmail, appointmentData } = await getAppointmentData(job.referenceId);
        await sendAppointmentReminder(appointmentData, customerEmail, customerName, staffNames, serviceNames, job.referenceId, job.scheduledTime);
    } catch (error) {
        console.error(`Error handling reminder for appointment ${job.referenceId}:`, error);
    }
}

// Cancel reminders
export async function cancelReminders(appointmentId) {
    await cancelScheduledSubAppointments(appointmentId);
    const jobRecords = await scheduledJob.find({ referenceId: appointmentId });

    for (const job of jobRecords) {
        await deleteJob(job._id);
    }

    console.log(`🛑 Canceled all reminders for appointment: ${appointmentId}`);
}
