import { google } from "googleapis";

const getOrCreateSubCalendar = async (auth, staffName, userEmail = null) => {
    const calendar = google.calendar({ version: "v3", auth });

    const isGmail =(userEmail)? userEmail.endsWith("@gmail.com"):false;

    const { data } = await calendar.calendarList.list();
    const existingCalendar = data.items.find((cal) => cal.summary === `Staff-${staffName}`);
    let calendarId;
    if (existingCalendar) {
        calendarId = existingCalendar.id;
    } else {
        const newCalendar = await calendar.calendars.insert({
            requestBody: { summary: `Staff-${staffName}` },
        });
        calendarId = newCalendar.data.id;
    }

    if (isGmail) {
        await calendar.acl.insert({
            calendarId: calendarId,
            resource: {
                role: "reader",
                scope: {
                    type: "user",
                    value: userEmail,
                },
            },
        });
    }
    return calendarId;
};

export const deleteCalendar = async (auth, calendarId) => {
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.calendars.delete({
        auth,
        calendarId: calendarId
    });
}

export default getOrCreateSubCalendar;