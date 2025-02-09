import { google } from 'googleapis';
import { AppError } from "../../AppError.js";

const calendar = google.calendar('v3');

/**
 * Update an event's start and end times in a specific Google Calendar.
 *
 * @param {Object} auth - The OAuth2 client used for Google API authentication.
 * @param {string} eventId - The ID of the event to be updated.
 * @param {string} calendarId - The calendar ID where the event is located (e.g., 'primary' or a specific calendar ID).
 * @param {Object} eventData - Event data including the new start time, end time, and any additional details.
 * @param {Date|string} eventData.newStartTime - The new start time for the event.
 * @param {Date|string} eventData.newEndTime - The new end time for the event.
 * @param {Object} [eventData.additionalData={}] - Additional event details like description, location, attendees, etc.
 * @returns {Promise<Object>} - The updated event.
 */
export const updateCalendarEvent = async (auth, eventId, calendarId, eventData) => {
    const { newStartTime, newEndTime, additionalData = {} } = eventData;

    // Prepare the updated event data
    const updatedEvent = {
        start: {
            dateTime: new Date(newStartTime).toISOString(),
            timeZone: 'UTC',
        },
        end: {
            dateTime: new Date(newEndTime).toISOString(),
            timeZone: 'UTC',
        },
        ...additionalData,
    };

    try {
        const response = await calendar.events.update({
            calendarId: calendarId,
            eventId: eventId,
            auth: auth,
            resource: updatedEvent,
        });

        return response.data;
    } catch (error) {
        console.error("Error updating event:", error);
        throw new AppError("Failed to update event in Google Calendar", 500);
    }
};
