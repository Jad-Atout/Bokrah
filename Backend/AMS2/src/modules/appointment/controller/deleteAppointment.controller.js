import { AppError } from "../../../utils/AppError.js";
import appointmentModel from "../../../../DB/models/appointment.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import mongoose from "mongoose";
import createEvent from "../../../utils/Google/events/createEvent.js";
//TODO fix integrity handleing

//TODO send email to the customer and staff when an appointment is deleted
export const deleteAppointment = async (req, res, next) => {
    const { appointmentId } = req.body;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;

    const session = (req.session) ? req.session : await mongoose.startSession();
    session.startTransaction();
    let deletedEvents = [];
    let deletedAppointments = [];

    try {
        const appointment = await appointmentModel.findById(appointmentId).populate("subAppointments.staffId").session(session);
        if (!appointment) {
            return next(new AppError("Appointment not found", 404));
        }

        for (const subAppointment of appointment.subAppointments) {
            const { eventId, staffId } = subAppointment;
            const staffData = subAppointment.staffId;

            if (eventId) {
                await deleteEvent(authClient, staffData.calendarId, eventId);
                deletedEvents.push({ eventId, calendarId: staffData.calendarId });
            }
        }

        await appointmentModel.findByIdAndDelete(appointmentId, { session });
        deletedAppointments.push(appointment);

        await session.commitTransaction();
        session.endSession();
        if(req.session){
            req.deletedEvents = deletedEvents;
        }


        return res.status(200).json({
            message: "Appointment and associated events deleted successfully",
            deletedAppointments,
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        for (const event of deletedEvents) {
            if (event?.eventId) {
                //TODO pass the event data
                await createEvent(authClient, event.calendarId, event.eventId);
            }
        }

        return next(new AppError(`Failed to delete appointment(s): ${error}`, 500));
    }
};
