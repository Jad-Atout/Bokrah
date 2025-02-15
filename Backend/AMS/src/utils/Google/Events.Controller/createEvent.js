import {google} from "googleapis";

const createCalendarEvent = async (auth, appointment,services,calendarId) => {
    const calendar = google.calendar({ version: 'v3', auth });
    const event = {
        summary: `Appointment with ${appointment.customerId}`,
        description: `Services: ${services.join(', ')}`,
        start: { dateTime: new Date(appointment.startTime).toISOString(), timeZone: 'UTC' },
        end: { dateTime: new Date(appointment.endTime).toISOString(), timeZone: 'UTC' },
    };

    const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
    });

    return response.data;
};
export default createCalendarEvent;