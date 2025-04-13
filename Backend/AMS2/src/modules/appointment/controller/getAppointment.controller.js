import appointmentModel from "../../../../DB/models/appointment.js";
import { AppError } from "../../../utils/AppError.js";

export const getAppointments = async (req, res, next) => {
    try {
        const { clientId } = req.authUser;
        if (!clientId) {
            return next(new AppError("No clientId provided in params", 400));
        }

        const appointments = await appointmentModel
            .find({ clientId })
            .populate({
                path: "customerId",
                select: "userId",
                populate: { path: "userId", select: "userName email phoneNumber" },
            })
            .populate({
                path: "subAppointments",
                populate: [
                    {
                        path: "staffId",
                        select: "userId",
                        populate: { path: "userId", select: "userName email" },
                    },
                    {
                        path: "services._id",
                        model: "Service",
                        select: "price duration serviceName"
                    },
                ],
            })
            .exec();

        console.log(JSON.stringify(appointments, null, 2));

        // 1) Build an array of "calendarEvents" (flattened subAppointments)
        const calendarEvents = [];

        // 2) Also build a "detailedAppointments" array
        const detailedAppointments = [];

        appointments.forEach((appt) => {
            const {
                _id: appointmentId,
                status,
                customerId,
                subAppointments,
                recurrence,
                notes,         // <--- RETRIEVE NOTES FROM DB
                createdAt,
                updatedAt,
            } = appt;

            // Build a "detail" object that keeps the entire appointment data
            const detailObj = {
                _id: appointmentId,
                clientId: appt.clientId,
                customerId: appt.customerId,
                status,
                recurrence,
                notes,        // <--- INCLUDE NOTES IN THE RESPONSE
                createdAt,
                updatedAt,
                subAppointments: [],
            };

            // Loop over each subAppointment
            subAppointments.forEach((sub) => {
                const {
                    staffId,
                    services,
                    startTime: subStart,
                    endTime: subEnd,
                    status: subStatus,
                } = sub;

                // Collect staff info
                const staffUser = staffId?.userId;
                const staffName = staffUser?.userName || "Unknown Staff";
                const staffMongoId = staffId?._id?.toString() || null;

                // Collect service names
                const serviceNames = services
                    .map((srv) => {
                        if (!srv._id) return "Unknown Service";
                        return srv._id.serviceName || "Unknown";
                    })
                    .join(", ");

                // We'll use a simple color for all events (or map staff -> color if you prefer)
                const eventColor = "#007BFF";

                // 2a) Push a "calendar event"
                calendarEvents.push({
                    id: `${appointmentId}-${staffMongoId}`, // unique ID for this subAppt
                    appointmentId,
                    start: subStart,
                    end: subEnd,
                    service: serviceNames,
                    customerName: customerId?.userId?.userName || "Unknown Customer",
                    customerEmail: customerId?.userId?.email || "",
                    customerPhone: customerId?.userId?.phoneNumber || "",
                    color: eventColor,
                    staffId: staffMongoId,
                    staffName,
                    status: subStatus || status,
                });

                // 2b) Also push subAppointment details into "detailObj"
                detailObj.subAppointments.push({
                    _id: sub._id,
                    staffId: staffMongoId,
                    staffName,
                    services: services.map((service) => ({
                        serviceId: service._id?._id,
                        serviceName: service._id?.serviceName || "Unknown Service",
                        duration: service._id?.duration,
                        price: service._id?.price
                    })),
                    startTime: subStart,
                    endTime: subEnd,
                    status: subStatus,
                    createdAt: sub.createdAt,
                    updatedAt: sub.updatedAt,
                });
            });

            // 2c) Add the detailObj to "detailedAppointments"
            detailedAppointments.push(detailObj);
        });

        // 3) Return both flattened events (for calendar) and full appointments (for details)
        return res.status(200).json({
            message: "Success",
            data: {
                calendarEvents,        // array of events
                detailedAppointments,  // full data, if needed
            },
        });
    } catch (error) {
        console.error("Error in getAppointments:", error);
        return next(new AppError(`Failed to retrieve appointments: ${error.message}`, 500));
    }
};

export const getStaffAppointments = async (req, res, next) => {
    try {
        const { clientId } = req.authUser;
        const { staffId } = req.params;

        const appointments = await appointmentModel.find({
            clientId: clientId,
            subAppointments: {
                $elemMatch: {
                    staffId: staffId
                }
            }
        })
            .populate([
                {
                    path: "subAppointments.staffId",
                    populate: {
                        path: "userId",
                        model: "User",
                        select: "userName"
                    }
                },
                {
                    path: "subAppointments.services._id",
                    model: "Service",
                    select: "price duration serviceName"
                },
                {
                    path: "customerId",
                    populate: {
                        path: "userId",
                        model: "User",
                        select: "userName phoneNumber email"
                    }
                }
            ]);

        console.log(JSON.stringify(appointments, null, 2));

        // Filter subAppointments for this specific staffId
        const filteredAppointments = appointments.map(app => {
            const filteredSubs = app.subAppointments.filter(
                sub => sub.staffId._id.toString() === staffId
            );

            return {
                _id: app._id,
                clientId: app.clientId,
                // INCLUDE NOTES HERE AS WELL
                notes: app.notes || "",    // <--- ADDED NOTES
                customer: {
                    customerId: app.customerId._id,
                    userId: app.customerId.userId._id,
                    userName: app.customerId.userId.userName,
                    email: app.customerId.userId.email,
                    phoneNumber: app.customerId.userId.phoneNumber,
                },
                subAppointments: filteredSubs.map(sub => ({
                    subAppointmentId: sub._id,
                    startTime: sub.startTime,
                    endTime: sub.endTime,
                    eventId: sub.eventId,
                    status: sub.status,
                    staff: {
                        staffId: sub.staffId._id,
                        userId: sub.staffId.userId._id,
                        userName: sub.staffId.userId.userName
                    },
                    services: sub.services.map(service => ({
                        serviceId: service._id._id,
                        serviceName: service._id?.serviceName || "Unknown Service",
                        duration: service._id.duration,
                        price: service._id.price
                    }))
                }))
            };
        });

        return res.status(200).json({
            appointments: filteredAppointments
        });
    } catch (error) {
        console.error("Error in getStaffAppointments:", error);
        return next(new AppError(`Failed to retrieve staff appointments: ${error.message}`, 500));
    }
};
