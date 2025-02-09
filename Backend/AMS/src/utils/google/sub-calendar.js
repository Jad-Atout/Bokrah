import {google} from "googleapis";

const getOrCreateSubCalendar = async (auth, staffId) => {
    const calendar = google.calendar({ version: 'v3', auth });

    // Check if the calendar already exists
    const { data } = await calendar.calendarList.list();
    const existingCalendar = data.items.find((cal) => cal.summary === `Staff-${staffId}`);

    if (existingCalendar) {
        return existingCalendar.id;
    }

    // Create a new sub-calendar for the staff
    const newCalendar = await calendar.calendars.insert({
        requestBody: { summary: `Staff-${staffId}` },
    });

    return newCalendar.data.id;
};
export default getOrCreateSubCalendar