// ================================
// 📣 Specialized Notification Sender: Appointment Cancellation
// ================================
import clientModel from "../../../../../DB/models/client.js";
import staffModel from "../../../../../DB/models/staff.js";
import { createNotification } from "../../../notification/notification.controller.js";
import { appointmentTemplates } from "../../../notification/notificationTemplate.js";
import { resolveTriggeredBy } from "../utils/helpers.js";

/**
 * Sends cancellation notifications to the client and staff (excluding customer).
 *
 * @param {Object} params
 * @param {Object} params.appointment - The appointment document
 * @param {Object} params.customer - Populated customer object
 * @param {String} params.clientId - Client ID
 * @param {Array} params.allServices - List of all service names
 * @param {Object} params.authUser - Authenticated user who triggered the cancellation
 */
export const sendAppointmentCanceledNotifications = async ({
                                                               appointment,
                                                               customer,
                                                               clientId,
                                                               allServices,
                                                               authUser
                                                           }) => {
    const client = await clientModel.findById(clientId).populate("userId");
    const staffUserIds = appointment.subAppointments.map(sub => sub.staffId?.userId?._id).filter(Boolean);

    const triggeredBy = resolveTriggeredBy(authUser, {
        client,
        staffUserIds
    });

    // Notify client
    const firstSub = appointment.subAppointments[0];
    const mainStart = new Date(firstSub.startTime);
    await createNotification(
        client.userId._id,
        appointmentTemplates.canceled({
            customerName: customer.userId.userName,
            serviceName: allServices.join(", "),
            date: mainStart.toLocaleDateString(),
            time: mainStart.toLocaleTimeString(),
            trigger: triggeredBy,
        }),
        triggeredBy
    );

    // Notify each staff
    for (const sub of appointment.subAppointments) {
        const staff = sub.staffId;
        if (!staff?.userId?._id) continue;

        const serviceName = sub.services.map(s => s.serviceName).join(", ");
        const start = new Date(sub.startTime);

        await createNotification(
            staff.userId._id,
            appointmentTemplates.canceled({
                customerName: customer.userId.userName,
                serviceName,
                date: start.toLocaleDateString(),
                time: start.toLocaleTimeString(),
                trigger: triggeredBy,
            }),
            triggeredBy
        );
    }
};


// ================================
// 📣 Specialized Notification Sender: Appointment Creation
// ================================

/**
 * Sends booking notifications to the client and staff for multiple appointments.
 *
 * @param {Object} params
 * @param {Array} params.appointments - List of appointment documents
 * @param {Object} params.customer - Populated customer object
 * @param {String} params.clientId - Client ID
 * @param {Array} params.notificationServices - List of involved services
 * @param {Object} params.authUser - Authenticated user triggering the action
 */
export const sendAppointmentBookedNotifications = async ({
                                                             appointments,
                                                             customer,
                                                             clientId,
                                                             notificationServices,
                                                             authUser
                                                         }) => {
    const client = await clientModel.findById(clientId).populate("userId");

    const staffUserIds = await staffModel.find({
        _id: {
            $in: appointments.flatMap(app =>
                app.subAppointments.map(sub => sub.staffId)
            ),
        },
    }).then(docs => docs.map(doc => doc.userId._id));

    const triggeredBy = resolveTriggeredBy(authUser, { client, staffUserIds });

    // Notify client (use first subAppointment's start time)
    const firstSub = appointments[0].subAppointments[0];
    const mainStart = new Date(firstSub.startTime);

    await createNotification(
        client.userId._id,
        appointmentTemplates.booked({
            customerName: customer.userId.userName,
            serviceName: notificationServices.map(s => s.serviceName).join(", "),
            date: mainStart.toLocaleDateString(),
            time: mainStart.toLocaleTimeString(),
            trigger: triggeredBy,
        }),
        triggeredBy
    );

    // Notify each staff member
    for (const appointment of appointments) {
        for (const sub of appointment.subAppointments) {
            const staffDoc = await staffModel.findById(sub.staffId).populate("userId");
            if (!staffDoc?.userId) continue;

            const serviceName = sub.services.map(s => s.serviceName).join(", ");
            const start = new Date(sub.startTime);

            await createNotification(
                staffDoc.userId._id,
                appointmentTemplates.booked({
                    customerName: customer.userId.userName,
                    serviceName,
                    date: start.toLocaleDateString(),
                    time: start.toLocaleTimeString(),
                    trigger: triggeredBy,
                }),
                triggeredBy
            );
        }
    }
};



/**
 * Sends update and cancellation notifications to staff + client for updated appointments.
 *
 * @param {Object} params
 * @param {Array} params.appointments - List of updated appointment documents
 * @param {Object} params.customer - Populated customer object
 * @param {String} params.clientId - Client ID
 * @param {Array} params.notificationServices - List of services involved
 * @param {Object} params.authUser - Authenticated user
 */
export const sendAppointmentUpdatedNotifications = async ({
                                                              appointments,
                                                              customer,
                                                              clientId,
                                                              notificationServices,
                                                              authUser
                                                          }) => {
    const client = await clientModel.findById(clientId).populate("userId");

    const staffUserIds = await staffModel.find({
        _id: {
            $in: appointments.flatMap(app => app.subAppointments.map(sub => sub.staffId))
        }
    }).then(docs => docs.map(doc => doc.userId._id));

    const triggeredBy = resolveTriggeredBy(authUser, { client, staffUserIds });

    const firstSub = appointments[0].subAppointments[0];
    const mainStart = new Date(firstSub.startTime);

    // ✅ Notify client
    await createNotification(
        client.userId._id,
        appointmentTemplates.updated({
            customerName: customer.userId.userName,
            serviceName: notificationServices.map(s => s.serviceName).join(", "),
            oldDate: mainStart.toLocaleDateString(),
            newDate: mainStart.toLocaleDateString(),
            oldTime: mainStart.toLocaleTimeString(),
            newTime: mainStart.toLocaleTimeString(),
            trigger: triggeredBy,
        }),
        triggeredBy
    );

    // 🔁 Notify updated staff
    for (const appointment of appointments) {
        for (const sub of appointment.subAppointments.filter(s => s.status !== "Cancelled")) {
            const staffDoc = await staffModel.findById(sub.staffId).populate("userId");
            if (!staffDoc?.userId) continue;

            const serviceName = sub.services.map(s => s.serviceName).join(", ");
            const start = new Date(sub.startTime);

            await createNotification(
                staffDoc.userId._id,
                appointmentTemplates.updated({
                    customerName: customer.userId.userName,
                    serviceName,
                    oldDate: start.toLocaleDateString(),
                    newDate: start.toLocaleDateString(),
                    oldTime: start.toLocaleTimeString(),
                    newTime: start.toLocaleTimeString(),
                    trigger: triggeredBy,
                }),
                triggeredBy
            );
        }
    }

    // ❌ Notify removed staff (cancelled subs)
    for (const appointment of appointments) {
        for (const sub of appointment.subAppointments.filter(s => s.status === "Cancelled")) {
            const staffDoc = await staffModel.findById(sub.staffId).populate("userId");
            if (!staffDoc?.userId) continue;

            const serviceName = sub.services.map(s => s.serviceName).join(", ");
            const start = new Date(sub.startTime);

            await createNotification(
                staffDoc.userId._id,
                appointmentTemplates.canceled({
                    customerName: customer.userId.userName,
                    serviceName,
                    date: start.toLocaleDateString(),
                    time: start.toLocaleTimeString(),
                    trigger: triggeredBy,
                }),
                triggeredBy
            );
        }
    }
};
