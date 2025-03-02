
import { AppError } from '../../../utils/AppError.js';
import staffModel from '../../../../DB/models/staff.js';
import {getEvents} from "../../../utils/Google/events/getEvents.js";



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
    let freeIntervals = [{ startTime: slotStart, endTime: slotEnd }];
    events.forEach(event => {
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);
        console.log( "Event starts",eventStart,"\neventEnd", eventEnd);
        freeIntervals = freeIntervals.flatMap(interval => {
            if (eventStart > interval.startTime && eventEnd < interval.endTime) {
                return [
                    { startTime: interval.startTime, endTime: eventStart },
                    { startTime: eventEnd, endTime: interval.endTime }
                ];
            } else if (eventStart <= interval.startTime && eventEnd >= interval.endTime) {
                return [];
            } else if (eventStart <= interval.startTime) {
                return [{ startTime: eventEnd, endTime: interval.endTime }];
            } else {
                return [{ startTime: interval.startTime, endTime: eventStart }];
            }
        });
    });
    console.log(freeIntervals);
    return freeIntervals;

};

/**
 * Middleware: Generate available time slots for an appointment.
 *
 * Expects in req.body:
 *  - startDate: ISO string for the beginning of the date range (e.g., "2025-03-12T00:00:00Z")
 *  - endDate: ISO string for the end of the date range (e.g., "2025-03-12T23:59:59Z")
 *  - bufferTime (optional): Minutes to add between generated slots.
 *
 * Also expects:
 *  - req.staffsServices: an array of objects { staff, services } where each staff has his own internal availability and calendarId.
 *  - req.oauth2Client: OAuth client for accessing Google Calendar API.
 */

export const generateAvailableSlots = async (req, res, next) => {
    const { startDate, endDate, bufferTime = 0 } = req.body;
    const staffsServices = req.staffsServices;
    const authClient = req.oauth2Client;

    if (!startDate || !endDate) {
        return next(new AppError("startDate and endDate are required", 400));
    }

    let availableSlots = [];

    try {
        for (const staffServices of staffsServices) {
            const { staff, services } = staffServices;
            const staffId = staff._id;

            const staffData = await staffModel.findById(staffId)
                .populate('availability')
                .lean();
            if (!staffData || !staffData.availability) continue;
            const workingDays = staffData.availability.availability;

            let currentDate = new Date(startDate);
            const endDateObj = new Date(endDate);
            while (currentDate <= endDateObj) {

                const dayName = currentDate.toLocaleString('en-US', { weekday: 'long' });
                const dayAvail = workingDays.find(a => a.day.toLowerCase() === dayName.toLowerCase());

                if (dayAvail && dayAvail.slots.length > 0) {
                    for (const slot of dayAvail.slots) {

                        const slotStart = parseTimeAMPM(slot.startTime, currentDate);
                        const slotEnd = parseTimeAMPM(slot.endTime, currentDate);

                        const calendarId = staffData.calendarId;
                        const events = await getEvents(authClient, calendarId, slotStart, slotEnd);

                        let freeIntervals = computeFreeIntervals(slotStart, slotEnd, events);

                        const totalDurationMinutes = services.reduce((sum, service) => sum + service.duration, 0);

                        freeIntervals.forEach(interval => {
                            const duration = (interval.endTime - interval.startTime) / (1000 * 60);
                            if (duration >= totalDurationMinutes) {
                                let slotStartTime = new Date(interval.startTime);
                                while (slotStartTime.getTime() + totalDurationMinutes * 60000 <= interval.endTime.getTime()) {
                                    let slotEndTime = new Date(slotStartTime.getTime() + totalDurationMinutes * 60000);
                                        availableSlots.push({
                                            staffId,
                                            startTime: slotStartTime,
                                            endTime: slotEndTime
                                        });

                                    slotStartTime = new Date(slotEndTime.getTime() + bufferTime * 60000);
                                }
                            }
                        });
                    }
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        const {mergedSlots,slots} = mergeSlots(availableSlots)
        return res.status(200).json({
            message: 'Available slots generated successfully',mergedSlots,slots

        });
    } catch (error) {
        return next(new AppError(`Failed to generate available slots: ${error.message}`, 500));
    }
};


//TODO only works when one staff
//TODO unique slot
//TODO try another algorithm that catch the smaller service and compare it with other staff total availabilty
function mergeSlots(slots) {
    // Sort the slots by startTime
    slots.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    let mergedSlots = [];
    let visited = new Set(); // To track already merged slots

    for (let i = 0; i < slots.length; i++) {
        if (visited.has(i)) continue; // Skip already merged slot

        let currentSlot = slots[i];
        let mergedSlot = {
            startTime: currentSlot.startTime,
            endTime: currentSlot.endTime,
            staffIds: [currentSlot.staffId],
        };

        // Try to merge with the next available slot if possible
        for (let j = i + 1; j < slots.length; j++) {
            if (visited.has(j)) continue; // Skip already merged slot

            let nextSlot = slots[j];

            // Check if the slots are adjacent and have different staffIds
            let currentEnd = new Date(currentSlot.endTime);
            let nextStart = new Date(nextSlot.startTime);

            if (
                Math.abs(nextStart - currentEnd) <= 5 * 60 * 1000 && // Check if within 5 minutes
                !mergedSlot.staffIds.includes(nextSlot.staffId) // Ensure different staffId
            ) {
                // Merge the slots: update the merged endTime and add the staffId
                mergedSlot.endTime = nextSlot.endTime;
                mergedSlot.staffIds.push(nextSlot.staffId);
                visited.add(j); // Mark this slot as merged
            }
        }

        // Only add to mergedSlots if there are multiple staffIds (indicating a merge)
        if (mergedSlot.staffIds.length > 1) {
            mergedSlots.push(mergedSlot);
        }

        visited.add(i); // Mark this slot as merged
    }

    return {mergedSlots,slots};
}
