import { checkAvailability } from "../../../utils/Google/Services/checkAvailability.js";
import { AppError } from "../../../utils/AppError.js";
import mongoose from "mongoose";
import appointmentModel from "../../../../DB/models/appointment.js";
import createEvent from "../../../utils/Google/events/createEvent.js";
import deleteEvent from "../../../utils/Google/events/deleteEvent.js";
import staffModel from "../../../../DB/models/staff.js";
import customerModel from "../../../../DB/models/customer.js";
import customerClientModel from "../../../../DB/models/ClientCustomer.js";
import {calculateEndTime, checkInternalAvailability, generateRecurringDates} from "./helpers.js";
//TODO fix integrity handleing
//TODO share the staff calendar with the staff
//TODO send email to the customer and staff

export const createAppointment = async (req, res, next) => {
    const { startTime, customerId, recurrence, bufferTime = 0 } = req.body;
    const { clientId } = req.params;
    const authClient = req.oauth2Client;
    const staffsServices = req.staffsServices;
    const APPOINTMENT_STATUS = "Booked";
    const session = await mongoose.startSession();
    session.startTransaction();
    let createdEvents = [];
    let createdAppointments = [];

    const customer = await customerModel.findById(customerId).populate([{
        path:"userId",
        ref:"User",
        select:"userName email",
    }]).select("userName email");

    if(!customer) return next(new Error("customer is not found"));

    try {
        const appointmentDates = generateRecurringDates(startTime, recurrence);

        for (const appointmentStart of appointmentDates) {
            let subAppointments = [];
            let currentStartTime = new Date(appointmentStart); // Track the start time

            for (const staffServices of staffsServices) {
                const { staff, services } = staffServices;
                const staffId = staff._id

                const staffData = await staffModel.findById(staffId)
                    .populate([{ path: "userId", ref: "User", select: "userName email" }])
                    .session(session);

                const endTime = calculateEndTime(currentStartTime, services);

                const isInternalAvailable = await checkInternalAvailability(staffId, currentStartTime, endTime);
                if (!isInternalAvailable) {
                    throw new AppError(
                        `Staff ${staffData.userId.userName} is unavailable according to internal availability at ${currentStartTime.toISOString()}`,
                    400
                );                }

                const isAvailable = await checkAvailability(authClient, staffId, currentStartTime, endTime);
                if (!isAvailable) {
                    throw new AppError(
                        `Staff ${staffData.userId.userName} is unavailable at ${currentStartTime.toISOString()}`,
                    400
                );                }
                console.log(customer.userId.email)
                console.log(customer.userId.userName)
                console.log(staffData.userId.userName)
                console.log(staffData.userId.email)

                const event = await createEvent(req,authClient,
                    {
                        summary: `Appointment with ${customer.userId.userName} and ${staffData.userId.userName}`,
                description: `Service: ${services.map(service => service.serviceName).join(", ")}`,
                customerName:customer.userId.userName,
                    staffName:staffData.userId.userName,
                    serviceNames:services.map(service => service.serviceName),
                    startTime:currentStartTime,
                    endTime ,
                    calendarId:staffData.calendarId,
                    attendees: [
                    { email: customer.userId.email },
                    //  { email: staffData.userId.email },
                ],
                    sendUpdates: "all",
                    reminders: {
                    useDefault: false,
                        overrides: [
                        { method: "email", minutes: 60 },
                        { method: "popup", minutes: 30 },
                    ]
                },
            }
            );


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
        //TODO after adding this we have to make sure when deleting to keep data intgrity
        const assign = new customerClientModel({customerId:customerId,clientId})
        await assign.save({session})

        await session.commitTransaction();
        session.endSession();

        // Collect all staff names
        const staffNames = staffsServices.map(staffServices => staffServices.staff.userId.userName).join(", ");

// Collect all services
        const allServices = staffsServices.flatMap(staffServices =>
            staffServices.services.map(service => service.serviceName)
        );

// Send the email
        await sendEmail(
            customer.userId.email,
            "Your Appointment Confirmation",
            await appointmentConfirmationEmail(
                customer.userId.userName, // Customer name
                staffNames, // All staff names as a string
                allServices, // List of all services
                //startTime, // Appointment start time
                //calculateEndTime(startTime, allServices) // Calculate end time
            )
        );
        return res.status(201).json({
            message: "Appointments and calendar events created successfully",
            appointments: createdAppointments,
        });

    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();

        for (const event of createdEvents) {
            if (event?.eventId) {
                await deleteEvent(authClient, event.calendarId, event.eventId);
            }
        }
        return next(new AppError(`Failed to create appointment(s): ${error}`, 500));
    }
};



