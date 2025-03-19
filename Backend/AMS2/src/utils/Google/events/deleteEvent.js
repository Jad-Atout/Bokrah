import { AppError } from "../../AppError.js";
import { google } from "googleapis";

// Function to fetch event details, delete it, and return event data
const deleteEvent = async (auth, calendarId, eventId) => {
    if (!auth) {
        return  new AppError("Google authentication credentials not provided", 401);
    }
    if (!calendarId || !eventId) {
        return  new AppError("Both calendar ID and event ID are required to delete the event", 400);
    }
    try {
        const calendar = google.calendar({ version: "v3", auth });

        // Fetch the event details before deletion
        const event = await calendar.events.get({
            calendarId,
            eventId,
        });
        // Extract the event details from the fetched event object
        const { summary, description, start, end } = event.data;
        // Construct the event details object
        const eventData = {
            summary: summary,
            description: description ,
            end: end,
            start: start,
        };

        // Delete the event after capturing the data
        await calendar.events.delete({
            calendarId,
            eventId,
        });

        // Return event data after deletion
        return  eventData ;

    } catch (error) {
        console.log(error);
        return new AppError(`Failed to delete event from calendar ${calendarId}: ${error.message}`, 500);
    }
};

export default deleteEvent;
