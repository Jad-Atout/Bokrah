import { handleAppointmentReminder } from "./reminderSchedules.js";
import {handleAppointmentStatus} from "./appointmentSchedules.js";

const jobHandlers = {
    appointmentReminder: handleAppointmentReminder,
    subAppointmentEnd: handleAppointmentStatus
};

export default jobHandlers;
