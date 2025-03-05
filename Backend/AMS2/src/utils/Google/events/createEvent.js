import { google } from "googleapis";

const createCalendarEvent = async (req, auth, { customerName, staffName, serviceNames, startTime, endTime, calendarId }) => {
    const calendar = google.calendar({ version: "v3", auth });

    const eventData = req.eventData;

    const event = eventData ? {
        summary: eventData.eventData.summary ,
        description: eventData.eventData.description,
        start: eventData.eventData.start,
        end: eventData.eventData.end,
    } : {
        summary: `Appointment with ${customerName} \n
            organizer:  
                Name: ${req.authUser.userName}
                email: ${req.authUser.email}
                phoneNumber: ${req.authUser.phoneNumber}
        `,
        description: `Staff: ${staffName}\nServices: ${ serviceNames.join(", ") }`,
        start: {
            dateTime: new Date(startTime).toISOString(),
            timeZone: "UTC",
        },
        end: {
            dateTime: new Date(endTime).toISOString(),
            timeZone: "UTC",
        },
    };

        const response = await calendar.events.insert({
            calendarId,
            requestBody: event,
        });

        return response.data;

};

export default createCalendarEvent;
