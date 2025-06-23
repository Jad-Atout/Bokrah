// controller/cancelSubAppointmentTasks.controller.js
import mongoose from "mongoose";
import appointmentModel from "../../../../DB/models/appointment.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import { AppError } from "../../../utils/AppError.js";
import { sendAppointmentCanceledNotifications } from "./utils/notificationSenders.js";
import clientModel from "../../../../DB/models/client.js";
import staffModel from "../../../../DB/models/staff.js";
import {eventDeleteRollback, resolveTriggeredBy} from "./utils/helpers.js";
import { createNotification } from "../../notification/notification.controller.js";
import { appointmentTemplates } from "../../notification/notificationTemplate.js";
import { validateCancellationTime, validateOnlineCancellation } from "../../bookingSettings/utils/bookingSettingsUtils.js";
import {cancelSubAppointmentTasks} from "../../../utils/Scheduler/appointmentEndSchedules.js";
import {cancelReminders} from "../../../utils/Scheduler/reminderSchedules.js";
import {app} from "../../../../index.js";
import {sendEmail} from "../../../utils/email.js";
import {appointmentCancellationEmail} from "../../../utils/emailTemplete.js";

//TODO to be deleted
// This cancels one subAppointment from an appointment, not the entire thing
export const cancelSubAppointment = async (req, res, next) => {
    const { appointmentId, subAppointmentId, clientId } = req.params;
    const authClient = req.oauth2Client;
    const userRole = req.authUser.role;

    const session = await mongoose.startSession();
    session.startTransaction();

    const deletedEvents=[] ;
    let appointment;
    let subAppointment;

    try {
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

        if (!appointment) {
            return next(new AppError("Appointment not found", 404));
        }

        if (appointment.clientId.toString() !== clientId) {
            return next(
                new AppError("Unauthorized: You cannot cancel this appointment", 403)
            );
        }

         subAppointment = appointment.subAppointments.find(sub => {
            return sub._id.toString() === subAppointmentId;
        });

        if (!subAppointment) {
            return next(new AppError("Sub-appointment not found", 404));
        }

        if (subAppointment.status === "Cancelled") {
            return next(new AppError("Sub-appointment already cancelled", 400));
        }

        await validateOnlineCancellation(clientId, userRole);
        await validateCancellationTime(clientId, subAppointment.startTime, userRole);

        const eventId = subAppointment.eventId;
        if (eventId) {
            const evData = await deleteEvent(
                authClient,
                subAppointment.staffId.calendarId,
                eventId
            );
            deletedEvents.push({
                eventId,
                calendarId: subAppointment.staffId.calendarId,
                eventData: evData
            });
            subAppointment.eventId = undefined;
        }

        subAppointment.status = "Cancelled";

        const allCancelled = appointment.subAppointments.every(
            s => s.status === "Cancelled"
        );
        if (allCancelled) appointment.status = "Cancelled";

        await appointment.save({ session });
        await session.commitTransaction();

        session.endSession();

    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        await eventDeleteRollback(req, authClient, deletedEvents, appointment)
            .catch(console.error);

        return next(
            new AppError(`Failed to cancel the sub-appointment: ${err.message}`, err.status || 500)
        );
    }

    cancelSubAppointmentTasks(subAppointment._id)
        .catch(e => console.error("Scheduler error:", e));

    if (appointment.status === "Cancelled") {
        cancelReminders(appointmentId)
            .catch(e => console.error("Reminder cancel error:", e));
    }

        const client = await clientModel.findById(clientId).populate("userId");
        const staffUserIds = [subAppointment.staffId?.userId?._id].filter(Boolean);
        const triggeredBy = resolveTriggeredBy(req.authUser, { client, staffUserIds });
        const allServices = subAppointment.services.map(s => s.serviceName);


        // Notify client
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
        ).catch(err =>
         console.error("❌ Failed to Notify client",err));



        // Notify staff
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
            ).catch(err =>
                 console.error("❌ Failed to Notify staff",err));;
        }

        if(appointment.customerId.userId.email){
             sendEmail(
                 appointment.customerId.userId.email,
                "Your Appointment Has Been Canceled",
                await appointmentCancellationEmail(appointmentId)
            ).catch(err =>
                 console.error("❌ Failed to send customer email",err));
        }

        return res.status(200).json({
            message: "Sub-appointment cancelled successfully",
            cancelledSubAppointmentId: subAppointmentId,
            remainingSubAppointments: appointment.subAppointments,
        });

};
