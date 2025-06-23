// controller/cancelSubAppointment.controller.js
import mongoose from "mongoose";
import appointmentModel from "../../../../DB/models/appointment.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import { AppError } from "../../../utils/AppError.js";
import { sendAppointmentCanceledNotifications } from "./utils/notificationSenders.js";
import clientModel from "../../../../DB/models/client.js";
import staffModel from "../../../../DB/models/staff.js";
import { resolveTriggeredBy } from "./utils/helpers.js";
import { createNotification } from "../../notification/notification.controller.js";
import { appointmentTemplates } from "../../notification/notificationTemplate.js";
import { validateCancellationTime, validateOnlineCancellation } from "../../bookingSettings/utils/bookingSettingsUtils.js";

//TODO to be deleted
// This cancels one subAppointment from an appointment, not the entire thing
export const cancelSubAppointment = async (req, res, next) => {
    const { appointmentId, subAppointmentId, clientId } = req.params;
    const authClient = req.oauth2Client;
    const userRole = req.authUser.role; // Get user role from auth
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log("Hi___________")
        // 1) Find the appointment
        const appointment = await appointmentModel
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

        if (!appointment) {
            return next(new AppError("Appointment not found", 404));
        }

        // (Optional) Check if user is authorized to cancel this subAppointment
        if (appointment.clientId.toString() !== clientId) {
            return next(
                new AppError("Unauthorized: You cannot cancel this appointment", 403)
            );
        }

        // 2) Find the subAppointment you want to cancel
        const subAppointment = appointment.subAppointments.find(sub => {
            return sub._id.toString() === subAppointmentId;
        });

        if (!subAppointment) {
            return next(new AppError("Sub-appointment not found", 404));
        }

        // Validate online cancellation setting with user role
        await validateOnlineCancellation(clientId, userRole);

        // Validate cancellation time based on policy with user role
        await validateCancellationTime(clientId, subAppointment.startTime, userRole);

        // 3) Cancel the Google Calendar event for that subAppointment
        const eventId = subAppointment.eventId;
        console.log(eventId);
        if (eventId) {
            const staffId = subAppointment.staffId; // staffId is a doc, populated with .calendarId
            if (staffId?.calendarId) {
                await deleteEvent(authClient, staffId.calendarId, eventId);
            }
        }

        // 4) Update sub-appointment status to "Cancelled"
        subAppointment.status = "Cancelled";

        // 5) Check if all sub-appointments are cancelled, then update the parent appointment's status
        if (appointment.subAppointments.every(sub => sub.status === "Cancelled")) {
            appointment.status = "Cancelled"; // Cancel the parent appointment if all sub-appointments are cancelled
        }

        // Save the updated appointment
        await appointment.save({ session });
        await session.commitTransaction();
        session.endSession();

        // Send notifications
        const client = await clientModel.findById(clientId).populate("userId");
        const staffUserIds = [subAppointment.staffId?.userId?._id].filter(Boolean);
        const triggeredBy = resolveTriggeredBy(req.authUser, { client, staffUserIds });

        // Get all services for the cancelled sub-appointment
        const allServices = subAppointment.services.map(s => s.serviceName);

        // Notify client
        await createNotification(
            client.userId._id,
            appointmentTemplates.canceled({
                customerName: appointment.customerId.userId.userName,
                serviceName: allServices.join(", "),
                date: new Date(subAppointment.startTime).toLocaleDateString(),
                time: new Date(subAppointment.startTime).toLocaleTimeString(),
                trigger: triggeredBy,
            }),
            triggeredBy
        );

        // Notify staff
        if (subAppointment.staffId?.userId?._id) {
            await createNotification(
                subAppointment.staffId.userId._id,
                appointmentTemplates.canceled({
                    customerName: appointment.customerId.userId.userName,
                    serviceName: allServices.join(", "),
                    date: new Date(subAppointment.startTime).toLocaleDateString(),
                    time: new Date(subAppointment.startTime).toLocaleTimeString(),
                    trigger: triggeredBy,
                }),
                triggeredBy
            );
        }

        return res.status(200).json({
            message: "Sub-appointment cancelled successfully",
            cancelledSubAppointmentId: subAppointmentId,
            remainingSubAppointments: appointment.subAppointments,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return next(
            new AppError(`Failed to cancel the sub-appointment: ${error.message}`, 500)
        );
    }
};
