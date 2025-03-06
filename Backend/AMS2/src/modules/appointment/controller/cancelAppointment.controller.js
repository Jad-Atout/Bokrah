import mongoose from "mongoose";
import appointmentModel from "../../../../DB/models/appointment.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import { AppError } from "../../../utils/AppError.js";
import { cancelScheduledReminders } from "../../../utils/scheduler.js";
import { eventDeleteRollback } from "./helpers.js";
import { sendEmail } from "../../../utils/email.js";
import { appointmentDeletedEmail } from "../../../utils/emailTemplete.js";

export const cancelAppointment = async (req, res, next) => {
    const { appointmentId, clientId } = req.params;
    const authClient = req.oauth2Client;

    const session = await mongoose.startSession();
    session.startTransaction();

    let deletedEvents = [];
    let appointment;

    try {
        appointment = await appointmentModel
            .findById(appointmentId)
            .populate([
                {
                    path: "customerId",
                    ref: "customer",
                    populate: {
                        path: "userId",
                        ref: "user", // must match your schema
                        // select fields if needed: select: "email userName"
                    },
                },
                {
                    path: "subAppointments.staffId",
                    ref: "staff",
                    // optionally populate staff's userId if your schema has it
                    // populate: { path: "userId", ref: "user" }
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

        appointment.status = "Cancelled";
        await appointment.save({ session });

        cancelScheduledReminders(appointmentId);

        await session.commitTransaction();
        session.endSession();


        const customerEmail = appointment.customerId?.userId?.email;
        const userName = appointment.customerId?.userId?.userName || "Valued Customer";


//
        const staffNamesArr = appointment.subAppointments.map((sub) => {
            console.log("sub",sub)
            return sub.staffId?.userName || "Staff";
        });
        const staffNames = [...new Set(staffNamesArr)].join(", ");
//

//
        let allServicesArr = [];
        for (const sub of appointment.subAppointments) {
            if (Array.isArray(sub.services)) {
                // If you store services as { serviceName, ... } objects:
                const subServiceNames = sub.services.map((srv) => srv.serviceName);
                allServicesArr.push(...subServiceNames);
            }
        }
        const allServices = [...new Set(allServicesArr)];
//
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
            console.warn("No customer email found. Cannot send cancellation email.");
        }

        return res.status(200).json({
            message: "Appointment cancelled successfully",
            deletedEvents,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        await eventDeleteRollback(deletedEvents, appointment);

        return next(new AppError(`Failed to cancel the appointment: ${error.message}`, 500));
    }
};
