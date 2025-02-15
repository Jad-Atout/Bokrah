import {AppError} from "../../AppError.js";
import {google} from "googleapis";

const deleteCalendarEvent = async (auth, calendarId, eventId) => {
    if (!auth) {
        throw new AppError("Google authentication credentials not provided", 401);
    }
    if (!calendarId || !eventId) {
        throw new AppError("Both calendar ID and event ID are required to delete the event", 400);
    }

    try {
        const calendar = google.calendar({ version: "v3", auth });
        await calendar.events.delete({
            calendarId,
            eventId,
        });
    } catch (error) {
        throw new AppError(`Failed to delete event from calendar ${calendarId}`, 500);
    }
};
export default deleteCalendarEvent