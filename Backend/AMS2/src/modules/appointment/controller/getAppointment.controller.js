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
                        path: "services.serviceId",
                        model: "Service",
                        select: "serviceName price duration",
                    },
                ],
            })
            .exec();

        // We'll flatten subAppointments for "calendarEvents" usage
        const calendarEvents = [];
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
                notes
            } = appt;

            const detailObj = {
                _id: appointmentId,
                clientId: appt.clientId,
                customerId: appt.customerId,
                status,
                recurrence,
                notes,
                createdAt,
                updatedAt,
                subAppointments: [],
            };

            subAppointments.forEach((sub) => {
                const {
                    staffId,
                    services,
                    startTime: subStart,
                    endTime: subEnd,
                    status: subStatus,
                } = sub;

                const staffUser = staffId?.userId;
                const staffName = staffUser?.userName || "Unknown Staff";
                const staffMongoId = staffId?._id?.toString() || null;

                const serviceNames = services
                    .map((srv) => srv.serviceId?.serviceName || "")
                    .join(", ");

                const eventColor = "#007BFF";

                calendarEvents.push({
                    id: `${appointmentId}-${staffMongoId}`,
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

            detailedAppointments.push(detailObj);
        });

        return res.status(200).json({
            message: "Success",
            data: {
                calendarEvents,
                detailedAppointments,
            },
        });
    } catch (error) {
        console.error("Error in getAppointments:", error);
        return next(new AppError(`Failed to retrieve appointments: ${error.message}`, 500));
    }
};
