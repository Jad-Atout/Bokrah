import {google} from "googleapis";

export const getEvents = async (authClient, calendarId, timeMin, timeMax) => {
    const calendar = google.calendar({ version: 'v3', auth: authClient });
    const res = await calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
    });
    return res.data.items || [];
};