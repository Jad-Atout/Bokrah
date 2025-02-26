import { AppError } from '../../../utils/AppError.js';
import staffModel from '../../../../DB/models/staff.js';
import {getEvents} from "../../../utils/Google/events/getEvents.js"; // if needed



/**
 * Helper: Convert a time string (e.g., "09:00 AM") into a Date object on the given day.
 */
const parseTimeAMPM = (timeStr, date) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
};

/**
 * Helper: Compute free intervals within a working slot by subtracting busy events.
 * @param {Date} slotStart - Start of the working slot.
 * @param {Date} slotEnd - End of the working slot.
 * @param {Array} events - Array of events from Google Calendar (each with start.dateTime and end.dateTime).
 * @returns {Array} freeIntervals - Array of objects { start, end } representing free intervals.
 */
const computeFreeIntervals = (slotStart, slotEnd, events) => {
    let freeIntervals = [];
    // Sort events by start time.
    events.sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime));
    let current = slotStart;
    for (const event of events) {
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);
        if (current < eventStart) {
            freeIntervals.push({ start: new Date(current), end: new Date(eventStart) });
        }
        if (eventEnd > current) current = eventEnd;
    }
    if (current < slotEnd) {
        freeIntervals.push({ start: new Date(current), end: new Date(slotEnd) });
    }
    return freeIntervals;
};

/**
 * Helper: Intersect two arrays of intervals.
 * Each interval is an object: { start: Date, end: Date }
 */
const intersectIntervals = (intervalsA, intervalsB) => {
    let intersections = [];
    intervalsA.forEach(a => {
        intervalsB.forEach(b => {
            const start = new Date(Math.max(a.start.getTime(), b.start.getTime()));
            const end = new Date(Math.min(a.end.getTime(), b.end.getTime()));
            if (start < end) {
                intersections.push({ start, end });
            }
        });
    });
    return intersections;
};

/**
 * Helper: Intersect multiple arrays of intervals.
 * Expects intervalsArrays to be an array of arrays.
 */
const intersectMultipleIntervals = (intervalsArrays) => {
    return intervalsArrays.reduce((acc, curr) => intersectIntervals(acc, curr));
};

/**
 * Helper: Merge contiguous intervals.
 * Two intervals are merged if the end time of one exactly equals the start time of the next.
 */
const mergeIntervals = (intervals, tolerance = 0) => {
    if (!intervals || intervals.length === 0) return [];
    // Sort intervals by start time.
    intervals.sort((a, b) => a.start - b.start);
    const merged = [intervals[0]];
    for (let i = 1; i < intervals.length; i++) {
        const last = merged[merged.length - 1];
        const current = intervals[i];
        // If the gap is within tolerance, merge the intervals.
        if (current.start.getTime() - last.end.getTime() <= tolerance) {
            last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
        } else {
            merged.push(current);
        }
    }
    return merged;
};

/**
 * Middleware: Generate available time slots for an appointment by combining the availabilities
 * of all involved staffs. Then merge contiguous intervals into larger slots.
 *
 * Expects in req.body:
 *   - startDate: ISO string for the beginning of the date range (e.g., "2025-03-12T00:00:00Z")
 *   - endDate: ISO string for the end of the date range (e.g., "2025-03-12T23:59:59Z")
 *   - bufferTime (optional): Minutes to add between generated slots.
 *
 * Also expects:
 *   - req.staffsServices: array of objects { staff, services } where each staff has its own
 *     internal availability and calendarId.
 *   - req.oauth2Client: OAuth client for Google Calendar API.
 *
 * The middleware returns combined available slots that are common for all staffs.
 */
export const generateAvailableSlots = async (req, res, next) => {
    const { startDate, endDate, bufferTime = 0 } = req.body;
    const staffsServices = req.staffsServices;
    const authClient = req.oauth2Client;

    if (!startDate || !endDate) {
        return next(new AppError("startDate and endDate are required", 400));
    }

    try {
        // For each staff, compute an array of available slots (free intervals split by appointment duration)
        const allStaffSlots = [];

        for (const staffServices of staffsServices) {
            const { staff, services } = staffServices;
            const staffId = staff._id;
            // Fetch the staff document, including internal availability.
            const staffData = await staffModel.findById(staffId)
                .populate('availability')
                .lean();
            if (!staffData || !staffData.availability) continue;
            const workingDays = staffData.availability.availability; // Array of { day, slots: [ { startTime, endTime } ] }

            let staffSlots = []; // This will hold available slots for this staff.

            // Loop through each day in the given date range.
            let currentDate = new Date(startDate);
            const endDateObj = new Date(endDate);
            while (currentDate <= endDateObj) {
                // Get the day name (e.g., "Monday").
                const dayName = currentDate.toLocaleString('en-US', { weekday: 'long' });
                const dayAvail = workingDays.find(a => a.day.toLowerCase() === dayName.toLowerCase());
                if (dayAvail && dayAvail.slots.length > 0) {
                    for (const slot of dayAvail.slots) {
                        // Parse the working slot start and end times on the current day.
                        const slotStart = parseTimeAMPM(slot.startTime, currentDate);
                        const slotEnd = parseTimeAMPM(slot.endTime, currentDate);
                        // Fetch busy events from Google Calendar for this staff in the slot.
                        const calendarId = staffData.calendarId;
                        const events = await getEvents(authClient, calendarId, slotStart, slotEnd);
                        // Compute free intervals by subtracting busy events from the working slot.
                        const freeIntervals = computeFreeIntervals(slotStart, slotEnd, events);
                        // Total duration required for the appointment (sum of all service durations, in minutes).
                        const totalDurationMinutes = services.reduce((sum, service) => sum + service.duration, 0);
                        // For each free interval, split it into multiple consecutive slots if possible.
                        freeIntervals.forEach(interval => {
                            const duration = (interval.end - interval.start) / (1000 * 60); // in minutes
                            if (duration >= totalDurationMinutes) {
                                let slotStartTime = new Date(interval.start);
                                while (slotStartTime.getTime() + totalDurationMinutes * 60000 <= interval.end.getTime()) {
                                    let slotEndTime = new Date(slotStartTime.getTime() + totalDurationMinutes * 60000);
                                    staffSlots.push({
                                        start: slotStartTime,
                                        end: slotEndTime
                                    });
                                    // Move to the next potential slot, adding the buffer time.
                                    slotStartTime = new Date(slotEndTime.getTime() + bufferTime * 60000);
                                }
                            }
                        });
                    }
                }
                // Proceed to the next day.
                currentDate.setDate(currentDate.getDate() + 1);
            }
            allStaffSlots.push(staffSlots);
        }

        // Compute the intersection of available slots across all staffs.
        let combinedSlots = [];
        if (allStaffSlots.length > 0) {
            combinedSlots = intersectMultipleIntervals(allStaffSlots);
            // Merge contiguous intervals in the combined slots.
            combinedSlots = mergeIntervals(combinedSlots);
        }

        return res.status(200).json({
            message: 'Combined available slots generated successfully',
            availableSlots: combinedSlots
        });
    } catch (error) {
        return next(new AppError(`Failed to generate available slots: ${error.message}`, 500));
    }
};