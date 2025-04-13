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
    const { appointmentId, recurrence, slot, notes } = req.body;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;
    const session = await mongoose.startSession();
    session.startTransaction();

    let updatedEvents = [];
    let deletedEvents = [];
    let updatedAppointments = [];
    let appointment = await getAppointment(appointmentId, session);

    try {
        const customer = appointment.customerId;
        if (!customer) throw new AppError("Customer not found", 404);

        // 1) Cancel existing subAppointments & delete old events
        await cancelExistingSubAppointments(appointment, authClient, deletedEvents);

        // 2) Generate new subAppointments based on the updated `slot` & `recurrence`
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

            // if staff removed from the new request, handle them as "Cancelled"
            handleRemovedStaff(appointment.subAppointments, subAppointments);

            // 3) Update main appointment doc in DB
            const updatedAppointment = await saveUpdatedAppointment({
                appointmentId,
                startTime: appointmentStart,
                clientId,
                recurrence,
                subAppointments,
                session,
                notes
            });

            updatedAppointments.push(updatedAppointment);
        }

        await session.commitTransaction();
        session.endSession();

        // Cancel and re-schedule reminders for the updated appointment(s)
        await cancelReminders(appointment._id);
        await scheduleReminders(updatedAppointments);

        return res.status(200).json({
            message: "Appointment updated and calendar events created successfully",
            appointments: updatedAppointments,
        });
    } catch (error) {
        console.log(error);
        await session.abortTransaction();
        session.endSession();

        // Roll back newly created events
        await eventCreateRollback(updatedEvents, authClient);

        // Re-instate deleted events if needed
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

        // Delete old calendar event
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

async function buildSubAppointments(
    subSlots,
    customer,
    authClient,
    req,
    session,
    updatedEvents
) {
    const subAppointments = [];
    let currentStartTime = new Date();

    for (const subSlot of subSlots) {
        const { staffServices, startTime, endTime } = subSlot;
        if (startTime >= endTime) {
            throw new AppError("End time must be later than start time", 400);
        }

        for (const staffService of staffServices) {
            const { staffId, services } = staffService;

            const staffData = await staffModel
                .findById(staffId)
                .populate([{ path: "userId", ref: "User", select: "userName email" }])
                .session(session);

            const endTimeCalculated = calculateEndTime(startTime, services);

            // Check internal availability
            const isInternalAvailable = await checkInternalAvailability(
                staffId,
                startTime,
                endTimeCalculated
            );
            if (!isInternalAvailable) {
                throw new AppError(
                    `Staff ${staffData.userId.userName} is unavailable internally at ${startTime}`,
                    400
                );
            }

            // Check external (Google Calendar) availability
            const isAvailable = await checkAvailability(
                authClient,
                staffId,
                startTime,
                endTimeCalculated
            );
            if (!isAvailable) {
                throw new AppError(
                    `Staff ${staffData.userId.userName} is unavailable externally at ${startTime}`,
                    400
                );
            }

            // Create a new event
            const event = await createEvent(req, authClient, {
                customerName: customer.userId.userName,
                staffName: staffData.userId.userName,
                serviceNames: services.map((s) => s.serviceName),
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
    const newStaffIds = new Set(newSubs.map((s) => s.staffId.toString()));

    for (const oldSub of oldSubs) {
        if (!newStaffIds.has(oldSub.staffId._id.toString())) {
            oldSub.status = "Cancelled";
            newSubs.push(oldSub);
            // Optional: send notification to removed staff
        }
    }
}

async function saveUpdatedAppointment({
                                          appointmentId,
                                          startTime,
                                          clientId,
                                          recurrence,
                                          subAppointments,
                                          session,
                                          notes
                                      }) {
    return appointmentModel.findByIdAndUpdate(
        appointmentId,
        {
            startTime,
            clientId,
            status: "Booked",
            recurrence,
            subAppointments,
            notes
        },
        { new: true, session }
    );
}
