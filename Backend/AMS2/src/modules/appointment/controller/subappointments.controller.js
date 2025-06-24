import mongoose from "mongoose";
import appointmentModel from "../../../../DB/models/appointment.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import { AppError } from "../../../utils/AppError.js";
import { sendAppointmentCanceledNotifications } from "./utils/notificationSenders.js";
import clientModel from "../../../../DB/models/client.js";
import staffModel from "../../../../DB/models/staff.js";
import { eventDeleteRollback, resolveTriggeredBy } from "./utils/helpers.js";
import { createNotification } from "../../notification/notification.controller.js";
import { appointmentTemplates } from "../../notification/notificationTemplate.js";
import { validateCancellationTime, validateOnlineCancellation } from "../../bookingSettings/utils/bookingSettingsUtils.js";
import { cancelSubAppointmentTasks } from "../../../utils/Scheduler/appointmentEndSchedules.js";
import { cancelReminders } from "../../../utils/Scheduler/reminderSchedules.js";
import { sendEmail } from "../../../utils/email.js";
import { appointmentCancellationEmail } from "../../../utils/emailTemplete.js";

export const cancelSubAppointment = async (req, res, next) => {
    console.time("🟡 Total cancelSubAppointment time");

    const { appointmentId, subAppointmentId, clientId } = req.params;
    const authClient = req.oauth2Client;
    const userRole = req.authUser.role;

    const session = await mongoose.startSession();
    session.startTransaction();

    let appointment;
    let subAppointment;
    let deletedEvent;

    try {
        console.time("🔍 Fetch appointment");
        appointment = await appointmentModel
            .findById(appointmentId)
            .populate([
                {
                    path: "customerId",
                    ref: "Customer",
                    populate: { path: "userId", model: "User" },
                },
                {
                    path: "subAppointments.staffId",
                    ref: "Staff",
                    populate: { path: "userId", model: "User" },
                },
            ])
            .session(session);
        console.timeEnd("🔍 Fetch appointment");

        if (!appointment) throw new AppError("Appointment not found", 404);
        if (appointment.clientId.toString() !== clientId) throw new AppError("Unauthorized: You cannot cancel this appointment", 403);

        subAppointment = appointment.subAppointments.find(sub => sub._id.toString() === subAppointmentId);
        if (!subAppointment) throw new AppError("Sub-appointment not found", 404);
        if (subAppointment.status === "Cancelled") throw new AppError("Sub-appointment already cancelled", 400);

        console.time("⏱️ Validate cancellation");
        await validateOnlineCancellation(clientId, userRole);
        await validateCancellationTime(clientId, subAppointment.startTime, userRole);
        console.timeEnd("⏱️ Validate cancellation");

        // Only mark as deleted in DB now, delete from Google later
        subAppointment.status = "Cancelled";
        if (appointment.subAppointments.every(s => s.status === "Cancelled")) {
            appointment.status = "Cancelled";
        }
        await appointment.save({ session });

        await session.commitTransaction();
        session.endSession();

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.timeEnd("🟡 Total cancelSubAppointment time");
        return next(new AppError(`Failed to cancel the sub-appointment: ${err.message}`, err.status || 500));
    }

    // Background delete of Google event
    setImmediate(async () => {
        try {
            if (subAppointment.eventId) {
                await deleteEvent(
                    authClient,
                    subAppointment.staffId.calendarId,
                    subAppointment.eventId
                );
            }
        } catch (err) {
            await eventDeleteRollback(req, authClient, [{
                eventId: subAppointment.eventId,
                calendarId: subAppointment.staffId.calendarId,
            }], appointment).catch(console.error);
            console.error("❌ Failed to delete calendar event", err);
        }
    });

    console.time("⏲️ Cancel schedulers & reminders");
    cancelSubAppointmentTasks(subAppointment._id).catch(e => console.error("Scheduler error:", e));
    if (appointment.status === "Cancelled") {
        cancelReminders(appointmentId).catch(e => console.error("Reminder cancel error:", e));
    }
    console.timeEnd("⏲️ Cancel schedulers & reminders");

    console.time("🔔 Send notifications & email");

    const client = await clientModel.findById(clientId).populate("userId");
    const staffUserIds = [subAppointment.staffId?.userId?._id].filter(Boolean);
    const triggeredBy = resolveTriggeredBy(req.authUser, { client, staffUserIds });
    const allServices = subAppointment.services.map(s => s.serviceName);

    createNotification(
        client.userId._id,
        appointmentTemplates.canceled({
            customerName: appointment.customerId.userId.userName,
            serviceName: allServices.join(", "),
            date: new Date(subAppointment.startTime).toLocaleDateString(),
            time: new Date(subAppointment.startTime).toLocaleTimeString(),
            trigger: triggeredBy,
        }),
        triggeredBy
    ).catch(err => console.error("❌ Failed to Notify client", err));

    if (subAppointment.staffId?.userId?._id) {
        createNotification(
            subAppointment.staffId.userId._id,
            appointmentTemplates.canceled({
                customerName: appointment.customerId.userId.userName,
                serviceName: allServices.join(", "),
                date: new Date(subAppointment.startTime).toLocaleDateString(),
                time: new Date(subAppointment.startTime).toLocaleTimeString(),
                trigger: triggeredBy,
            }),
            triggeredBy
        ).catch(err => console.error("❌ Failed to Notify staff", err));
    }

    if (appointment.customerId.userId.email) {
        sendEmail(
            appointment.customerId.userId.email,
            "Your Appointment Has Been Canceled",
            await appointmentCancellationEmail(appointmentId)
        ).catch(err => console.error("❌ Failed to send customer email", err));
    }

    console.timeEnd("🔔 Send notifications & email");
    console.timeEnd("🟡 Total cancelSubAppointment time");

    return res.status(200).json({
        message: "Sub-appointment cancelled successfully",
        cancelledSubAppointmentId: subAppointmentId,
        remainingSubAppointments: appointment.subAppointments,
    });
};
