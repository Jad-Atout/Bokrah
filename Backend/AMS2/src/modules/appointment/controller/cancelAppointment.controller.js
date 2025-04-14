import mongoose from "mongoose";
import appointmentModel from "../../../../DB/models/appointment.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import { AppError } from "../../../utils/AppError.js";
import { eventDeleteRollback } from "./helpers.js";
import { sendEmail } from "../../../utils/email.js";
import {
    appointmentDeletedEmail,
    staffCancellationEmail
} from "../../../utils/emailTemplete.js";
import {cancelReminders} from "../../../utils/Scheduler/reminderSchedules.js";

export const cancelAppointment = async (req, res, next) => {
    const {clientId } = req.params;
    const {appointmentId} = req.body
    const authClient = req.oauth2Client;

    const session = await mongoose.startSession();
    session.startTransaction();

    let deletedEvents = [];
    let appointment = null;

    try {
        appointment = await appointmentModel
            .findById(appointmentId)
            .populate([
                {
                    path: "customerId",
                    ref: "customer",
                    populate: {
                        path: "userId",
                        ref: "user",
                    },
                },
                {
                    path: "subAppointments.staffId",
                    ref: "staff",
                    populate: {
                        path: "userId",
                        ref: "User",
                        select: "userName email",
                    },
                },
            ])
            .session(session);

        if (!appointment) {
            return next(new AppError("Appointment not found", 404));
        }
        if (appointment.clientId.toString() !== clientId) {
            return next(new AppError("Unauthorized: You cannot cancel this appointment", 403));
        }
        if (appointment.status === "Cancelled") {
            return next(new AppError("Appointment is already cancelled", 404));
        }

        for (const subAppointment of appointment.subAppointments) {
            subAppointment.status = "Cancelled";
            if (subAppointment.eventId && subAppointment.staffId?.calendarId) {
                const eventData = await deleteEvent(
                    authClient,
                    subAppointment.staffId.calendarId,
                    subAppointment.eventId
                );
                deletedEvents.push({
                    eventId: subAppointment.eventId,
                    calendarId: subAppointment.staffId.calendarId,
                    eventData,
                });
            }
        }
        req.deletedEvents = deletedEvents;

        appointment.status = "Cancelled";
        await appointment.save({ session });

        await cancelReminders(appointmentId);

        await session.commitTransaction();
        session.endSession();

        const customerEmail = appointment.customerId?.userId?.email;
        const userName = appointment.customerId?.userId?.userName || "Valued Customer";

        const staffNamesArr = appointment.subAppointments.map(sub => {
            return sub.staffId?.userId?.userName || sub.staffId?.userName || "Staff";
        });
        const staffNames = [...new Set(staffNamesArr)].join(", ");

        let allServicesArr = [];
        for (const sub of appointment.subAppointments) {
            if (Array.isArray(sub.services)) {
                const subServiceNames = sub.services.map(srv => srv.serviceName);
                allServicesArr.push(...subServiceNames);
            }
        }
        const allServices = [...new Set(allServicesArr)];


        if (customerEmail) {
            await sendEmail(
                customerEmail,
                "Your Appointment Has Been Canceled",
                await appointmentDeletedEmail(
                    userName,
                    staffNames,
                    allServices,
                    appointment.subAppointments
                )
            );
        } else {
            console.warn("No newCustomer email found. Cannot send cancellation email.");
        }


        const staffMap = {};
        for (const sub of appointment.subAppointments) {
            if (!sub.staffId) continue;
            const staffDoc = sub.staffId;

            const staffEmail = staffDoc.userId?.email;
            if (!staffEmail) continue;

            if (!staffMap[staffDoc._id]) {
                staffMap[staffDoc._id] = {
                    staffDoc,
                    subAppointments: [],
                };
            }
            staffMap[staffDoc._id].subAppointments.push(sub);
        }

        const staffEmailPromises = [];
        for (const key in staffMap) {
            const { staffDoc, subAppointments } = staffMap[key];
            const staffName = staffDoc.userId?.userName || staffDoc.userName || "Staff";
            const staffEmail = staffDoc.userId?.email;

            staffEmailPromises.push(
                sendEmail(
                    staffEmail,
                    "Appointment Cancelled",
                    await staffCancellationEmail(
                        userName,
                        staffName,
                        subAppointments
                    )
                )
            );
        }
        await Promise.all(staffEmailPromises);

        return res.status(200).json({
            message: "Appointment cancelled successfully",
            deletedEvents,
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        await eventDeleteRollback(req,authClient,deletedEvents, appointment);

        return next(
            new AppError(`Failed to cancel the appointment: ${error.message}`, 500)
        );
    }
};