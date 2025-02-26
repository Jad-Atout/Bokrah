import staffModel from "../../../../DB/models/staff.js"
import {AppError} from "../../AppError.js";
import {google} from "googleapis";

export const checkAvailability = async (authClient, staffId, startTime, endTime) => {
    const staff = await staffModel.findById(staffId);
    if (!staff || !staff.calendarId) {
        throw new AppError("Staff member does not have a calendar ID associated", 404);
    }
    const {calendarId} = staff;
    const calendar = google.calendar({ version: 'v3', auth: authClient });
    const response = await calendar.freebusy.query({
        requestBody:{
            timeMin: startTime,
            timeMax: endTime,
            timeZone:'UTC',
            items: [{ id: calendarId }]
        }
    })
    const busySlots = response.data.calendars[calendarId].busy
    return busySlots.length === 0
};
