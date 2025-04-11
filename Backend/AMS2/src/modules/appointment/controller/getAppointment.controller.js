import appointmentModel from "../../../../DB/models/appointment.js";
import { AppError } from "../../../utils/AppError.js";

export const getAppointments = async (req, res, next) => {
    try {
        const { clientId } = req.params;
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
                        path: "services.serviceId", // make sure to match your field name
                        model: "Service",
                        select: "serviceName price duration",
                    },
                ],
            })
            .exec();

        // 2) Build an array of "calendarEvents"
        //    (flatten subAppointments for each appointment)
        const calendarEvents = [];

        // Also build a "detailedAppointments" array
        // so front-end can see the entire structure if needed
        const detailedAppointments = [];

        appointments.forEach((appt) => {
            const {
                _id: appointmentId,
                status,
                customerId,
                subAppointments,
                recurrence,
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
                    .map((srv) => srv.serviceId?.serviceName || "")
                    .join(", ");

                // We'll use a simple color for all events or map staff -> color if you want
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
                    // if sub doesn't have its own status, fallback to the main "status"
                });

                // 2b) Also push subAppointment details into "detailObj"
                detailObj.subAppointments.push({
                    _id: sub._id,
                    staffId: staffMongoId,
                    staffName,
                    services: services.map((srv) => ({
                        serviceId: srv.serviceId?._id,
                        serviceName: srv.serviceId?.serviceName,
                        price: srv.serviceId?.price,
                        duration: srv.duration,
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
