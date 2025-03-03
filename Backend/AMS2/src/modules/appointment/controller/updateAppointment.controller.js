import { AppError } from "../../../utils/AppError.js";
import appointmentModel from "../../../../DB/models/appointment.js";
import createEvent from "../../../utils/Google/events/createEvent.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import { calculateEndTime, checkInternalAvailability, generateRecurringDates } from "./helpers.js";
import customerModel from "../../../../DB/models/customer.js"
import mongoose from "mongoose";
//TODO fix integrity handleing
//TODO ownership
export const updateAppointment = async (req, res, next) => {
    const { appointmentId } = req.body;
    const { startTime, customerId, recurrence, bufferTime = 0 } = req.body;
    const { clientId } = req.params;
    const {  oauth2Client, staffsServices } = req;
    const APPOINTMENT_STATUS = "Updated";
    const deletedEvents = [];
    const createdEvents = [];
    let createdAppointments = [];
    const session =  await mongoose.startSession();
    session.startTransaction();

    const appointment = await appointmentModel.findById(appointmentId).populate("subAppointments.staffId").session(session);
    if (!appointment) return next(new AppError("Appointment not found", 404));

    try {

        for (const subAppointment of appointment.subAppointments) {
            const { eventId, staffId } = subAppointment;
            const staff = subAppointment.staffId;

            const customer = await customerModel.findById(customerId).populate([{
                path: "userId",
                ref: "User",
                select: "userName",
            }]).select("userName");

            if (!customer) return next(new AppError("Customer not found", 404));
console.log(oauth2Client)
            if (eventId) {
                await deleteEvent(oauth2Client, staff.calendarId, eventId);
                deletedEvents.push({ eventId,
                    calendarId: staff.calendarId,
                    customerName: customer.userId.userName,
                });
            }

        }

        await appointmentModel.findByIdAndDelete(appointmentId).session(session);



        const appointmentDates = generateRecurringDates(startTime, recurrence);

        for (const appointmentStart of appointmentDates) {
            let subAppointments = [];
            let currentStartTime = new Date(appointmentStart);

            for (const staffServices of staffsServices) {
                const { staff, services } = staffServices;
                const staffId = staff._id;

                const staffData = await staffModel.findById(staffId).populate([{ path: "userId", ref: "User", select: "userName" }]).session(session);
                const endTime = calculateEndTime(currentStartTime, services);

                const isInternalAvailable = await checkInternalAvailability(staffId, currentStartTime, endTime);
                if (!isInternalAvailable) {
                    throw new AppError(`Staff ${staffData.userId.userName} is unavailable according to internal availability at ${currentStartTime.toISOString()}`, 400);
                }

                const event = await createEvent(req, oauth2Client, {
                    customerName: customer.userId.userName,
                    staffName: staffData.userId.userName,
                    serviceNames: services.map(service => service.serviceName),
                    startTime: currentStartTime,
                    endTime,
                    calendarId: staffData.calendarId,
                });

                createdEvents.push({ eventId: event.id, calendarId: staffData.calendarId });
                subAppointments.push({ staffId, services, startTime: currentStartTime, endTime, eventId: event.id });

                currentStartTime = new Date(endTime);
                currentStartTime.setMinutes(currentStartTime.getMinutes() + bufferTime);
            }

            const appointment = new appointmentModel({
                startTime: appointmentStart,
                clientId,
                customerId,
                status: APPOINTMENT_STATUS,
                subAppointments,
            });

            await appointment.save({ session });
            createdAppointments.push(appointment);
        }


    } catch (error) {
        for (const event of createdEvents) {
            if (event?.eventId) {
                await deleteEvent(oauth2Client, event.calendarId, event.eventId);
            }
        }

        // Rollback database changes
        await session.abortTransaction();
        session.endSession();

        for (const event of deletedEvents) {
            if (event?.eventId) {
                await createEvent(req, oauth2Client, {});
            }
        }

        return next(new AppError(`Failed to update appointment(s): ${error}`, 500));
    }
};
