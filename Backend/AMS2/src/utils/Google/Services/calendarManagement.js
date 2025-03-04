import { google } from "googleapis";

const getOrCreateSubCalendar = async (auth,staffName) => {
    const calendar = google.calendar({ version: "v3", auth });

    const { data } = await calendar.calendarList.list();
    const existingCalendar = data.items.find((cal) => cal.summary === `Staff-${staffName}`);

    if (existingCalendar) {
        return existingCalendar.id;
    }

    const newCalendar = await calendar.calendars.insert({
        requestBody: { summary: `Staff-${staffName}` },
    });
    return newCalendar.data.id;

};
export const deleteCalendar = async (auth, calendarId) => {
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.calendars.delete({
        auth,
        calendarId: calendarId
    });
}

export default getOrCreateSubCalendar;