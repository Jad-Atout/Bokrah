import appointmentModel from "../../../../DB/models/appointment.js";
import { AppError } from "../../../utils/AppError.js";

export const getAppointments = async (req, res, next) => {
    try {
        // 1) read clientId from token
        const { clientId } = req.authUser;
        if (!clientId) {
            return next(new AppError("No clientId provided in auth", 400));
        }

        // 2) fetch all appointments for that client
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
                        // We'll also fetch the "serviceColor" from the Service model
                        path: "services._id",
                        model: "Service",
                        select: "price duration serviceName serviceColor"
                    },
                ],
            })
            .exec();

        // debug
        console.log("Full appointments =>", JSON.stringify(appointments, null, 2));

        // We'll build:
        // 1) calendarEvents (flattened for calendar)
        // 2) detailedAppointments (the original structure, but with some extra info)
        const calendarEvents = [];
        const detailedAppointments = [];

        appointments.forEach((appt) => {
            const {
                _id: appointmentId,
                status,
                customerId,
                subAppointments,
                recurrence,
                notes,
                createdAt,
                updatedAt,
            } = appt;

            // We'll store everything in a detailObj
            const detailObj = {
                _id: appointmentId,
                clientId: appt.clientId,
                customerId: appt.customerId,
                status,
                recurrence,
                notes,
                createdAt,
                updatedAt,
                subAppointments: [], // we fill it below
            };

            // Loop each subAppointment
            subAppointments.forEach((sub) => {
                const {
                    _id: subApptId,
                    staffId,
                    services,
                    startTime: subStart,
                    endTime: subEnd,
                    status: subStatus,
                } = sub;

                // Staff info
                const staffUser = staffId?.userId;
                const staffName = staffUser?.userName || "Unknown Staff";
                const staffMongoId = staffId?._id?.toString() || null;

                // Extract service info
                // We collect each service's color, but if there's at least one, we pick the first's color for the event
                // or default #007BFF
                let subServiceColor = "#007BFF";
                if (services?.length > 0) {
                    const firstSrv = services[0]?._id;
                    if (firstSrv?.serviceColor) {
                        subServiceColor = firstSrv.serviceColor;
                    }
                }

                // e.g. "Haircut, Coloring"
                const serviceNames = services
                    .map((srv) => srv._id?.serviceName || "Unknown")
                    .join(", ");

                // *** Flattened calendar event
                calendarEvents.push({
                    id: `${appointmentId}-${staffMongoId}`,
                    appointmentId,
                    start: subStart,
                    end: subEnd,
                    service: serviceNames,
                    customerName: customerId?.userId?.userName || "Unknown Customer",
                    customerEmail: customerId?.userId?.email || "",
                    customerPhone: customerId?.userId?.phoneNumber || "",
                    color: subServiceColor, // use that color
                    staffId: staffMongoId,
                    staffName,
                    status: subStatus || status,
                });

                // build subAppt details for the "detailedAppointments"
                const mappedServices = services.map((service) => ({
                    serviceId: service._id?._id,
                    serviceName: service._id?.serviceName || "Unknown Service",
                    duration: service._id?.duration,
                    price: service._id?.price,
                    serviceColor: service._id?.serviceColor || "#808080"
                }));

                detailObj.subAppointments.push({
                    _id: subApptId,
                    staffId: staffMongoId,
                    staffName,
                    services: mappedServices,
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

export const getStaffAppointments = async (req, res, next) => {
    try {
        const { clientId } = req.authUser;
        const { staffId } = req.params;

        const appointments = await appointmentModel.find({
            clientId,
            subAppointments: {
                $elemMatch: { staffId }
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
                    // select serviceColor here too
                    path: "subAppointments.services._id",
                    model: "Service",
                    select: "price duration serviceName serviceColor"
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

        console.log("Staff appointments =>", JSON.stringify(appointments, null, 2));

        // Filter subAppointments for this specific staffId
        const filteredAppointments = appointments.map(app => {
            const filteredSubs = app.subAppointments.filter(
                sub => sub.staffId?._id?.toString() === staffId
            );

            return {
                _id: app._id,
                clientId: app.clientId,
                notes: app.notes || "",
                customer: {
                    customerId: app.customerId._id,
                    userId: app.customerId.userId._id,
                    userName: app.customerId.userId.userName,
                    email: app.customerId.userId.email,
                    phoneNumber: app.customerId.userId.phoneNumber,
                },
                subAppointments: filteredSubs.map(sub => {
                    const mappedServices = sub.services.map(service => ({
                        serviceId: service._id?._id,
                        serviceName: service._id?.serviceName || "Unknown Service",
                        duration: service._id?.duration,
                        price: service._id?.price,
                        serviceColor: service._id?.serviceColor || "#808080"
                    }));

                    return {
                        subAppointmentId: sub._id,
                        startTime: sub.startTime,
                        endTime: sub.endTime,
                        eventId: sub.eventId,
                        status: sub.status,
                        staff: {
                            staffId: sub.staffId?._id,
                            userId: sub.staffId?.userId?._id,
                            userName: sub.staffId?.userId?.userName
                        },
                        services: mappedServices
                    };
                })
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
