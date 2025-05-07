import { AppError } from "../../../utils/AppError.js";
import BookingSettings from "../../../../DB/models/bookingSettings.js";

export const getBookingSettingsForClient = async (clientId) => {
    const settings = await BookingSettings.findOne({ clientId });
    if (!settings) {
        return await BookingSettings.create({ clientId });
    }
    return settings;
};

export const validateCancellationTime = async (clientId, appointmentTime, userRole) => {
    // Skip time validation for clients and staff
    if (userRole === 'Client' || userRole === 'Staff') {
        return;
    }

    const settings = await getBookingSettingsForClient(clientId);
    const now = new Date();
    const appointmentDate = new Date(appointmentTime);
    const timeDiff = appointmentDate - now;
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    switch (settings.cancellationPolicy) {
        case "1 hour":
            if (hoursDiff < 1) {
                throw new AppError("Cannot cancel appointment less than 1 hour before", 400);
            }
            break;
        case "2 hours":
            if (hoursDiff < 2) {
                throw new AppError("Cannot cancel appointment less than 2 hours before", 400);
            }
            break;
        case "4 hours":
            if (hoursDiff < 4) {
                throw new AppError("Cannot cancel appointment less than 4 hours before", 400);
            }
            break;
        case "6 hours":
            if (hoursDiff < 6) {
                throw new AppError("Cannot cancel appointment less than 6 hours before", 400);
            }
            break;
        case "anytime":
        default:
            // No time restriction
            break;
    }
};

export const validateReschedulingTime = async (clientId, appointmentTime, userRole) => {
    // Skip time validation for clients and staff
    if (userRole === 'Client' || userRole === 'Staff') {
        return;
    }

    const settings = await getBookingSettingsForClient(clientId);
    const now = new Date();
    const appointmentDate = new Date(appointmentTime);
    const timeDiff = appointmentDate - now;
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    switch (settings.cancellationPolicy) {
        case "1 hour":
            if (hoursDiff < 1) {
                throw new AppError("Cannot reschedule appointment less than 1 hour before", 400);
            }
            break;
        case "2 hours":
            if (hoursDiff < 2) {
                throw new AppError("Cannot reschedule appointment less than 2 hours before", 400);
            }
            break;
        case "4 hours":
            if (hoursDiff < 4) {
                throw new AppError("Cannot reschedule appointment less than 4 hours before", 400);
            }
            break;
        case "6 hours":
            if (hoursDiff < 6) {
                throw new AppError("Cannot reschedule appointment less than 6 hours before", 400);
            }
            break;
        case "anytime":
        default:
            // No time restriction
            break;
    }
};

export const validateOnlineCancellation = async (clientId, userRole) => {
    // Skip online cancellation validation for clients and staff
    if (userRole === 'Client' || userRole === 'Staff') {
        return;
    }

    const settings = await getBookingSettingsForClient(clientId);
    if (!settings.bookingFlow.allowOnlineCancellations) {
        throw new AppError("Online cancellations are not allowed", 403);
    }
};

export const validateOnlineRescheduling = async (clientId, userRole) => {
    // Skip online rescheduling validation for clients and staff
    if (userRole === 'Client' || userRole === 'Staff') {
        return;
    }

    const settings = await getBookingSettingsForClient(clientId);
    if (!settings.bookingFlow.allowOnlineRescheduling) {
        throw new AppError("Online rescheduling is not allowed", 403);
    }
};

export const validateMultipleServices = async (clientId, services) => {
    const settings = await getBookingSettingsForClient(clientId);
    if (!settings.bookingFlow.provideMultipleServices && services.length > 1) {
        throw new AppError("Multiple services are not allowed", 400);
    }
}; 