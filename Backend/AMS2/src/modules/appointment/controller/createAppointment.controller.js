import {checkAvailability} from "../../../utils/Google/Services/checkAvailability.js";
import {AppError} from "../../../utils/AppError.js";
//TODO we have to set staff Availability
export const createAppointment =async (req, res,next) => {
    const {startTime,customerId,staffId} = req.body;
    const{clientId} = req.params;
    const authClient = req.oauth2Client;
    const services = req.services
    const APPOINTMENT_STATUS = "Booked"
    const endTime = prepareAppointmentData(authClient,startTime,services)
    const isAvailable = await checkAvailability(authClient, staffId, startTime, endTime);

}


const prepareAppointmentData = (authClient, startTime, services) => {
    if (!authClient) {
        throw new AppError("Google authentication credentials not provided", 401);
    }
    return calculateEndTime(startTime, services);
};

export const calculateEndTime = (startTime, services) => {
    let totalDuration = 0;
    services.forEach((service) => {
        totalDuration += service.duration;
    });
    const startDate = (startTime instanceof Date) ? startTime : new Date(startTime);
    const endTime = new Date(startDate.getTime() + totalDuration * 60000);
    return endTime.toISOString();
};