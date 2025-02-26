import { google } from "googleapis";

//TODO provide more data to the event
const createCalendarEvent = async (auth, { customerName, staffName, serviceNames, startTime, endTime, calendarId }) => {
    const calendar = google.calendar({ version: "v3", auth });

    // Format event details
    const event = {
        summary: `Appointment with ${customerName}`,
        description: `Staff: ${staffName}\nServices: ${serviceNames.join(", ")}`,
        start: { dateTime: new Date(startTime).toISOString(), timeZone: "UTC" },
        end: { dateTime: new Date(endTime).toISOString(), timeZone: "UTC" },
    };

    // Insert event into Google Calendar
    const response = await calendar.events.insert({
        calendarId,
        requestBody: event,
    });

    return response.data;
};

export default createCalendarEvent;
