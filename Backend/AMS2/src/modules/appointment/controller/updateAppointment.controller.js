// services/appointment/updateAppointmentService.js

import { AppError } from "../../../utils/AppError.js";
import appointmentModel from "../../../../DB/models/appointment.js";
import createEvent from "../../../utils/Google/events/createEvent.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import {
    calculateEndTime,
    checkInternalAvailability,
    eventCreateRollback,
    eventDeleteRollback,
    generateRecurringDates,
} from "./helpers.js";
import staffModel from "../../../../DB/models/staff.js";
import mongoose from "mongoose";
import { checkAvailability } from "../../../utils/Google/Services/checkAvailability.js";
import {
    cancelReminders,
    scheduleReminders,
} from "../../../utils/Scheduler/reminderSchedules.js";

export const updateAppointment = async (req, res, next) => {
    const { appointmentId, recurrence, slot } = req.body;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;
    const session = await mongoose.startSession();
    session.startTransaction();

    let updatedEvents = [];
    let deletedEvents = [];
    let updatedAppointments = [];
    let appointment=await getAppointment(appointmentId, session);
    try {
        const customer = appointment.customerId;
        if (!customer) throw new AppError("Customer not found", 404);

        await cancelExistingSubAppointments(appointment, authClient, deletedEvents);

        const appointmentDates = generateRecurringDates(slot.startTime, recurrence);
        for (const appointmentStart of appointmentDates) {
            const subAppointments = await buildSubAppointments(
                slot.subSlots,
                customer,
                authClient,
                req,
                session,
                updatedEvents
            );

            handleRemovedStaff(appointment.subAppointments, subAppointments);

            const updatedAppointment = await saveUpdatedAppointment({
                appointmentId,
                startTime: appointmentStart,
                clientId,
                recurrence,
                subAppointments,
                session
            });

            updatedAppointments.push(updatedAppointment);
        }

        await session.commitTransaction();
        session.endSession();

        await cancelReminders(appointment._id);
        await scheduleReminders(updatedAppointments);

        return res.status(200).json({
            message: "Appointment updated and calendar events created successfully",
            appointments: updatedAppointments,
        });
    } catch (error) {
        console.log(error)
        await session.abortTransaction();
        session.endSession();

        await eventCreateRollback(updatedEvents, authClient);
        if (appointment) {
            await eventDeleteRollback(req, authClient, deletedEvents, appointment);
        }

        return next(new AppError(`Failed to update appointment(s): ${error.message}`, 500));
    }
};

// ───────────────────────────
// 🔧 Helper Functions
// ───────────────────────────

async function getAppointment(appointmentId, session) {
    const appointment = await appointmentModel.findById(appointmentId).populate([
        {
            path: "customerId",
            ref: "Customer",
            populate: { path: "userId", model: "User" },
        },
        {
            path: "subAppointments.staffId",
            ref: "Staff",
        },
    ]).session(session);

    if (!appointment) throw new AppError("Appointment not found", 404);
    return appointment;
}

async function cancelExistingSubAppointments(appointment, authClient, deletedEvents) {
    for (const subAppointment of appointment.subAppointments) {
        subAppointment.status = "Cancelled";
        // Don't call subAppointment.save() – we save the full doc later

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

async function buildSubAppointments(subSlots, customer, authClient, req, session, updatedEvents) {
    const subAppointments = [];
    let currentStartTime = new Date();

    for (const subSlot of subSlots) {
        const { staffServices, startTime, endTime } = subSlot;
        if (startTime >= endTime) throw new AppError("End time must be later than start time", 400);

        for (const staffService of staffServices) {
            const { staffId, services } = staffService;

            const staffData = await staffModel
                .findById(staffId)
                .populate([{ path: "userId", ref: "User", select: "userName email" }])
                .session(session);
                console.log(services)
            const endTimeCalculated = calculateEndTime(startTime, services);

            const isInternalAvailable = await checkInternalAvailability(staffId, startTime, endTimeCalculated);
            if (!isInternalAvailable) {
                throw new AppError(`Staff ${staffData.userId.userName} is unavailable internally at ${startTime}`, 400);
            }

            const isAvailable = await checkAvailability(authClient, staffId, startTime, endTimeCalculated);
            if (!isAvailable) {
                throw new AppError(`Staff ${staffData.userId.userName} is unavailable externally at ${startTime}`, 400);
            }
            console.log(endTimeCalculated)
            const event = await createEvent(req, authClient, {
                customerName: customer.userId.userName,
                staffName: staffData.userId.userName,
                serviceNames: services.map(service => service.serviceName),
                startTime,
                endTime: endTimeCalculated,
                calendarId: staffData.calendarId,
                attendees: [{ email: customer.userId.email }],
                sendUpdates: "all",
            });

            updatedEvents.push({ eventId: event.id, calendarId: staffData.calendarId });

            subAppointments.push({
                staffId,
                services,
                startTime,
                endTime: endTimeCalculated,
                eventId: event.id,
            });

            currentStartTime = new Date(endTimeCalculated);
        }
    }

    return subAppointments;
}

function handleRemovedStaff(oldSubs, newSubs) {
    const newStaffIds = new Set(newSubs.map(s => s.staffId.toString()));

    for (const oldSub of oldSubs) {
        if (!newStaffIds.has(oldSub.staffId._id.toString())) {
            oldSub.status = "Cancelled";
            newSubs.push(oldSub);
            // TODO: Send notification to removed staff
        }
    }
}

async function saveUpdatedAppointment({ appointmentId, startTime, clientId, recurrence, subAppointments, session }) {
    return appointmentModel.findByIdAndUpdate(
        appointmentId,
        {
            startTime,
            clientId,
            status: "Booked",
            recurrence,
            subAppointments,
        },
        { new: true, session }
    );
}
