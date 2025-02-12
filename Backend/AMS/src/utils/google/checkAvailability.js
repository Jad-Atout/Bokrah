import { google } from 'googleapis';
import { staffModel } from "../../../DB/model/relations.js";
import { AppError } from "../AppError.js";

/**
 * Asynchronously checks the availability of a staff member's Google Calendar for a specified time period.
 *
 * @param {Object} authClient - Authorized Google API client used for calendar communication.
 * @param {number} staffId - Unique identifier of the staff member whose calendar availability is being checked.
 * @param {string} startTime - Start time of the period to check, in ISO 8601 format.
 * @param {string} endTime - End time of the period to check, in ISO 8601 format.
 * @throws {AppError} Throws an error if the staff member is not found or does not have an associated calendar ID.
 * @returns {Promise<boolean>} Resolves to a boolean indicating whether the calendar is free (true) or busy (false) during the specified time period.
 */
export const checkGoogleCalendarAvailability = async (authClient, staffId, startTime, endTime) => {
        const staff = await staffModel.findOne({where:{
            id: staffId,
            }});
        if (!staff || !staff.CalendarId) {
            throw new AppError("Staff member does not have a calendar ID associated", 404);
        }
        const {CalendarId} = staff;
        const calendar = google.calendar({ version: 'v3', auth: authClient });
        const response = await calendar.freebusy.query({
            requestBody:{
                timeMin: startTime,
                timeMax: endTime,
                timeZone:'UTC',
                items: [{ id: CalendarId }]
            }
        })
        const busySlots = response.data.calendars[CalendarId].busy
        return busySlots.length === 0
};
