import { google } from 'googleapis';
import { staffModel } from "../../../DB/model/relations.js";
import { AppError } from "../AppError.js";
const calendar = google.calendar('v3');
/**
 * Checks if the staff member's calendar has any events within the specified time slot.
 *
 * @param {Object} auth - The OAuth2 client used for Google API authentication.
 * @param {number} staffId - The ID of the staff member.
 * @param {Date|string} startTime - The start time of the desired time slot.
 * @param {Date|string} endTime - The end time of the desired time slot.
 * @returns {Promise<boolean>} - Returns true if the time slot is available, throws an error otherwise.
 */
export const checkGoogleCalendarAvailability = async (auth, staffId, startTime, endTime) => {
    try {
        const staff = await staffModel.findByPk(staffId, { attributes: ['calendarId'] });
        if (!staff || !staff.calendarId) {
            throw new AppError("Staff member does not have a calendar ID associated", 404);
        }
        const calendarId = staff.calendarId;
        const response = await calendar.events.list({
            calendarId,
            auth,
            timeMin: new Date(startTime).toISOString(),  // Ensure correct format for Google API
            timeMax: new Date(endTime).toISOString(),    // Ensure correct format for Google API
            singleEvents: true,                          // Return only single events (no recurring events)
            orderBy: 'startTime',                        // Order events by start time
        });
        if (response.data.items.length > 0) {
            throw new AppError("The selected time slot is unavailable", 400);
        }
        return true;
    } catch (error) {
        // Handle Google API specific errors
        if (error.code === 403) {
            throw new AppError("Access to Google Calendar is forbidden. Please check authentication credentials.", 403);
        }
        console.error("Error checking calendar availability:", error);
        throw new AppError("Failed to check calendar availability. Please try again later.", 500);
    }
};
