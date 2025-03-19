import { handleAppointmentReminder } from "./reminderSchedules.js";
import {handleAppointmentStatus} from "./appointmentEndSchedules.js";

const jobHandlers = {
    appointmentReminder: handleAppointmentReminder,
    subAppointmentEnd: handleAppointmentStatus
};

export default jobHandlers;