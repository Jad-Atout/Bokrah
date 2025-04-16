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
    const reminderSettings = await reminderModel.findOne({ clientId });
    return reminderSettings?.reminderTimes?.map((time, index) => ({
        method: reminderSettings.reminderMethods?.[index % reminderSettings.reminderMethods.length] || "email",
        minutes: Number.isFinite(time) ? time : 60,
    })) || [{ method: "email", minutes: 60 }];
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
        sms: false,
        push: true,
    };

    // 📨 Email Reminder
    if (reminderPrefs.email) {
        await scheduleJob("appointmentReminder-email", appointmentId, scheduledTime, async () => {
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
    }

    // 📱 SMS Reminder (placeholder function)
    // if (reminderPrefs.sms && appointmentData.customerId.userId.phoneNumber) {
    //     await scheduleJob("appointmentReminder-sms", appointmentId, scheduledTime, async () => {
    //         await sendSMS(
    //             appointmentData.customerId.userId.phoneNumber,
    //             `Reminder: You have an appointment for ${serviceNames.join(", ")} with ${staffNames.join(", ")}`
    //         );
    //     });
    // }

    // 🔔 Push Reminder (placeholder function)
    // if (reminderPrefs.push) {
    //     await scheduleJob("appointmentReminder-push", appointmentId, scheduledTime, async () => {
    //         await sendPushNotification(
    //             userId,
    //             "Appointment Reminder",
    //             `You have an appointment for ${serviceNames.join(", ")} with ${staffNames.join(", ")}`
    //         );
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
