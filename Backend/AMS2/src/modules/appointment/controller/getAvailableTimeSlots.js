import { AppError } from '../../../utils/AppError.js';
import staffModel from '../../../../DB/models/staff.js';
import { getEvents } from '../../../utils/Google/events/getEvents.js';
import { generateRecurringDates } from "./helpers.js";
//TODO fix the returning of un available slots in the recurring dates
const parseTimeAMPM = (timeStr, date) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (modifier.toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
};

const computeFreeIntervals = (slotStart, slotEnd, events) => {
    let freeIntervals = [{ startTime: slotStart, endTime: slotEnd }];

    events.forEach(event => {
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);

        freeIntervals = freeIntervals.flatMap(interval => {
            if (eventStart <= interval.startTime && eventEnd >= interval.endTime) {
                return [];
            }
            if (eventStart > interval.startTime && eventEnd < interval.endTime) {
                return [
                    { startTime: interval.startTime, endTime: eventStart },
                    { startTime: eventEnd, endTime: interval.endTime }
                ];
            }
            if (eventStart <= interval.startTime && eventEnd > interval.startTime) {
                return [{ startTime: eventEnd, endTime: interval.endTime }];
            }
            if (eventStart < interval.endTime && eventEnd >= interval.endTime) {
                return [{ startTime: interval.startTime, endTime: eventStart }];
            }
            return [interval];
        });
    });

    return freeIntervals;
};

const filterConsistentSlots = (availableSlots, recurrenceDates) => {
    let slotOccurrences = {};

    for (let dayKey in availableSlots) {
        availableSlots[dayKey].forEach(slot => {
            let slotKey = `${slot.startTime.toISOString()}-${slot.endTime.toISOString()}`;
            slotOccurrences[slotKey] = (slotOccurrences[slotKey] || 0) + 1;
        });
    }

    // Only keep slots that appear in ALL recurrence dates
    let validSlots = Object.keys(slotOccurrences).filter(slotKey =>
        slotOccurrences[slotKey] === recurrenceDates.length
    );

    let filteredSlots = {};
    for (let dayKey in availableSlots) {
        filteredSlots[dayKey] = availableSlots[dayKey].filter(slot =>
            validSlots.includes(`${slot.startTime.toISOString()}-${slot.endTime.toISOString()}`)
        );
    }

    return filteredSlots;
};

// Function to merge slots and maintain service execution order
function mergeSlots(slots, staffNumber) {
    slots.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    let mergedSlots = [];
    let seenSlots = new Set();

    for (let i = 0; i < slots.length; i++) {
        let currentSlot = slots[i];
        let slotKey = `${currentSlot.startTime}-${currentSlot.endTime}`; // Fixed syntax

        if (seenSlots.has(slotKey)) continue;
        seenSlots.add(slotKey);

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

        for (let j = i + 1; j < slots.length; j++) {
            let nextSlot = slots[j];
            let currentEnd = new Date(mergedSlot.endTime);
            let nextStart = new Date(nextSlot.startTime);

            if (
                Math.abs(nextStart - currentEnd) <= 5 * 60 * 1000 &&
                !mergedSlot.subSlots.some(subSlot =>
                    subSlot.staffServices.some(service =>
                        nextSlot.staffServices.some(ns => ns.staffId === service.staffId)
                    )
                )
            ) {
                mergedSlot.endTime = nextSlot.endTime;
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

        mergedSlots.push(mergedSlot);
    }

    return { slots: mergedSlots.filter(slot => slot.subSlots.length === staffNumber) };
}

export const generateAvailableSlots = async (req, res, next) => {
    const { startDate, endDate, recurrence } = req.body;
    const staffsServices = req.staffsServices;
    const authClient = req.oauth2Client;

    if (!startDate || !endDate) {
        return next(new AppError("startDate and endDate are required", 400));
    }

    let availableSlots = {};
    try {
        let recurrenceDates = generateRecurringDates(startDate, recurrence);

        for (const staffServices of staffsServices) {
            const { staff, services } = staffServices;
            const staffId = staff._id;
            const staffData = await staffModel.findById(staffId)
                .populate('availability')
                .lean();
            if (!staffData || !staffData.availability) continue;

            const workingDays = staffData.availability.availability;
            for (const recDateStr of recurrenceDates) {
                let currentDate = new Date(recDateStr);
                const dayName = currentDate.toLocaleString('en-US', { weekday: 'long' });
                const dayAvail = workingDays.find(a => a.day.toLowerCase() === dayName.toLowerCase());

                if (dayAvail && dayAvail.slots.length > 0) {
                    for (const slot of dayAvail.slots) {
                        const slotStart = parseTimeAMPM(slot.startTime, currentDate);
                        const slotEnd = parseTimeAMPM(slot.endTime, currentDate);

                        const calendarId = staffData.calendarId;
                        const events = await getEvents(authClient, calendarId, slotStart, slotEnd);

                        let freeIntervals = computeFreeIntervals(slotStart, slotEnd, events);
                        let totalDuration = services.reduce((sum, service) => sum + service.duration + (service.bufferTime || 0), 0);

                        freeIntervals.forEach(interval => {
                            const duration = (interval.endTime - interval.startTime) / (1000 * 60);
                            if (duration >= totalDuration) {
                                let slotStartTime = new Date(interval.startTime);
                                while (slotStartTime.getTime() + totalDuration * 60000 <= interval.endTime.getTime()) {
                                    let slotEndTime = new Date(slotStartTime.getTime() + totalDuration * 60000);
                                    let dayKey = recDateStr.split('T')[0];

                                    if (!availableSlots[dayKey]) availableSlots[dayKey] = [];

                                    availableSlots[dayKey].push({
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

                                    slotStartTime = new Date(slotEndTime.getTime());
                                }
                            }
                        });
                    }
                }
            }
        }

        availableSlots = filterConsistentSlots(availableSlots, recurrenceDates);
        let mergedSlots = mergeSlots(Object.values(availableSlots).flat(), staffsServices.length);

        return res.status(200).json({
            message: 'Available slots generated successfully',
            mergedSlots,
        });

    } catch (error) {
        console.log(error);
        return next(new AppError(`Failed to generate available slots: ${error.message}`, 500));
    }
};
