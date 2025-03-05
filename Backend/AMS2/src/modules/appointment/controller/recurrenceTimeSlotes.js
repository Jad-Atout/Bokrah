import { AppError } from '../../../utils/AppError.js';
import staffModel from '../../../../DB/models/staff.js';
import { getEvents } from '../../../utils/Google/events/getEvents.js';

// Function to parse time with AM/PM format
const parseTimeAMPM = (timeStr, date) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
};

// Function to compute available free time slots
const computeFreeIntervals = (slotStart, slotEnd, events) => {
    let freeIntervals = [{ startTime: slotStart, endTime: slotEnd }];

    events.forEach(event => {
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);

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

    return freeIntervals;
};

// Function to check for recurrence
const checkRecurrence = (startDate, recurrenceRule) => {
    const recurrenceDays = recurrenceRule.split(','); // Example: "monday,wednesday"
    const recurrenceStart = new Date(startDate);
    const recurrenceEnd = new Date(startDate);
    recurrenceEnd.setDate(recurrenceEnd.getDate() + 7); // Check for a week of recurrence for now

    let validRecurrenceSlots = [];
    let currentDate = new Date(recurrenceStart);

    while (currentDate <= recurrenceEnd) {
        const dayName = currentDate.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
        if (recurrenceDays.includes(dayName)) {
            validRecurrenceSlots.push(new Date(currentDate)); // Add valid recurrence days
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return validRecurrenceSlots;
};

// Generate available slots for multiple staff
export const generateAvailableSlots = async (req, res, next) => {
    const { startDate, endDate, recurrenceRule } = req.body;
    const staffsServices = req.staffsServices; // List of staff and their services
    const authClient = req.oauth2Client;

    if (!startDate || !endDate) {
        return next(new AppError("startDate and endDate are required", 400));
    }

    let availableSlots = [];

    try {
        for (const staffServices of staffsServices) {
            const { staff, services } = staffServices;
            const staffId = staff._id;

            // Retrieve staff working availability
            const staffData = await staffModel.findById(staffId)
                .populate('availability')
                .lean();
            if (!staffData || !staffData.availability) continue;

            const workingDays = staffData.availability.availability;
            let currentDate = new Date(startDate);
            const endDateObj = new Date(endDate);

            // Check for recurrence days
            const validRecurrenceSlots = checkRecurrence(startDate, recurrenceRule);

            // Check each valid recurrence slot
            for (const validDate of validRecurrenceSlots) {
                const dayName = validDate.toLocaleString('en-US', { weekday: 'long' });
                const dayAvail = workingDays.find(a => a.day.toLowerCase() === dayName.toLowerCase());

                if (dayAvail && dayAvail.slots.length > 0) {
                    for (const slot of dayAvail.slots) {
                        const slotStart = parseTimeAMPM(slot.startTime, validDate);
                        const slotEnd = parseTimeAMPM(slot.endTime, validDate);

                        const calendarId = staffData.calendarId;
                        const events = await getEvents(authClient, calendarId, slotStart, slotEnd);

                        let freeIntervals = computeFreeIntervals(slotStart, slotEnd, events);

                        // Calculate total service duration including buffer time
                        let totalDuration = services.reduce((sum, service) => sum + service.duration + (service.bufferTime || 0), 0);

                        freeIntervals.forEach(interval => {
                            const duration = (interval.endTime - interval.startTime) / (1000 * 60);
                            if (duration >= totalDuration) {
                                let slotStartTime = new Date(interval.startTime);
                                while (slotStartTime.getTime() + totalDuration * 60000 <= interval.endTime.getTime()) {
                                    let slotEndTime = new Date(slotStartTime.getTime() + totalDuration * 60000);
                                    availableSlots.push({
                                        startTime: slotStartTime,
                                        endTime: slotEndTime,
                                        staffServices: [
                                            {
                                                staffId,
                                                services: services.map(s => s._id),
                                                totalDuration
                                            }
                                        ]
                                    });

                                    slotStartTime = new Date(slotEndTime.getTime()); // Move to next slot
                                }
                            }
                        });
                    }
                }
            }
        }

        // Merge slots and check for staff availability
        const mergedSlots = mergeSlots(availableSlots, staffsServices.length);

        return res.status(200).json({
            message: 'Available slots generated successfully',
            mergedSlots,
        });

    } catch (error) {
        return next(new AppError(`Failed to generate available slots: ${error.message}`, 500));
    }
};

// Function to merge slots and maintain service execution order
function mergeSlots(slots, staffNumber) {
    slots.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    let mergedSlots = [];

    for (let i = 0; i < slots.length; i++) {
        let currentSlot = slots[i];
        let mergedSlot = {
            startTime: currentSlot.startTime,
            endTime: currentSlot.endTime,
            subSlots: [
                {
                    startTime: currentSlot.startTime,
                    endTime: currentSlot.endTime,
                    staffServices: currentSlot.staffServices.map(service => ({
                        staffId: service.staffId,
                        services: service.services
                    }))
                }
            ]
        };

        // Merge logic
        for (let j = i + 1; j < slots.length; j++) {
            let nextSlot = slots[j];
            let currentEnd = new Date(mergedSlot.endTime);
            let nextStart = new Date(nextSlot.startTime);

            if (
                Math.abs(nextStart - currentEnd) <= 5 * 60 * 1000 &&
                !mergedSlot.subSlots[0].staffServices.some(service =>
                    service.staffId === nextSlot.staffServices[0].staffId
                )
            ) {
                mergedSlot.endTime = nextSlot.endTime;
                mergedSlot.subSlots[0].endTime = nextSlot.endTime;
                mergedSlot.subSlots.push({
                    startTime: nextSlot.startTime,
                    endTime: nextSlot.endTime,
                    staffServices: nextSlot.staffServices.map(service => ({
                        staffId: service.staffId,
                        services: service.services
                    }))
                });
            }
        }

        // Check if this mergedSlot already exists in mergedSlots (based on startTime, endTime, and staffIds)
        const isDuplicate = mergedSlots.some(slot =>
            slot.startTime.getTime() === mergedSlot.startTime.getTime() &&
            slot.endTime.getTime() === mergedSlot.endTime.getTime() &&
            JSON.stringify(slot.subSlots.map(s => s.staffServices)) === JSON.stringify(mergedSlot.subSlots.map(s => s.staffServices))
        );

        if (!isDuplicate) {
            mergedSlots.push(mergedSlot);
        }
    }

    // Filter the slots to only those with the specified number of staff
    const finalSlots = mergedSlots.filter(slot => slot.subSlots.length === staffNumber);

    return { slot: finalSlots };
}
