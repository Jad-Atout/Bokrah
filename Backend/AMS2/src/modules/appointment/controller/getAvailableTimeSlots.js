import { AppError } from '../../../utils/AppError.js';
import staffModel from '../../../../DB/models/staff.js';
import { getEvents } from '../../../utils/Google/events/getEvents.js';
import { generateRecurringDates } from "./helpers.js";

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
    console.log(`\n[DEBUG] Checking free intervals between ${slotStart} and ${slotEnd}`);
    console.log("[DEBUG] Busy Events Fetched:", JSON.stringify(events, null, 2));

    let freeIntervals = [{ startTime: slotStart, endTime: slotEnd }];

    events.forEach(event => {
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);
        console.log(`[DEBUG] Processing Busy Event from ${eventStart} to ${eventEnd}`);

        freeIntervals = freeIntervals.flatMap(interval => {
            if (eventStart <= interval.startTime && eventEnd >= interval.endTime) {
                console.log("[DEBUG] Event completely covers slot, removing...");
                return [];
            }
            if (eventStart > interval.startTime && eventEnd < interval.endTime) {
                console.log("[DEBUG] Splitting slot around busy event");
                return [
                    { startTime: interval.startTime, endTime: eventStart },
                    { startTime: eventEnd, endTime: interval.endTime }
                ];
            }
            if (eventStart <= interval.startTime && eventEnd > interval.startTime) {
                console.log("[DEBUG] Trimming start of slot");
                return [{ startTime: eventEnd, endTime: interval.endTime }];
            }
            if (eventStart < interval.endTime && eventEnd >= interval.endTime) {
                console.log("[DEBUG] Trimming end of slot");
                return [{ startTime: interval.startTime, endTime: eventStart }];
            }
            return [interval];
        });
    });

    console.log("[DEBUG] Free intervals after filtering:", JSON.stringify(freeIntervals, null, 2));
    return freeIntervals;
};

const filterConsistentSlots = (availableSlots, recurrenceDates) => {
    console.log("[DEBUG] Before filtering available slots:", JSON.stringify(availableSlots, null, 2));

    let slotOccurrences = {};
    for (let dayKey in availableSlots) {
        availableSlots[dayKey].forEach(slot => {
            let slotKey = `${slot.startTime.toISOString()}-${slot.endTime.toISOString()}`;
            slotOccurrences[slotKey] = (slotOccurrences[slotKey] || 0) + 1;
        });
    }

    let validSlots = Object.keys(slotOccurrences).filter(slotKey =>
        slotOccurrences[slotKey] === recurrenceDates.length
    );

    let filteredSlots = {};
    for (let dayKey in availableSlots) {
        filteredSlots[dayKey] = availableSlots[dayKey].filter(slot =>
            validSlots.includes(`${slot.startTime.toISOString()}-${slot.endTime.toISOString()}`)
        );
    }

    console.log("[DEBUG] After filtering consistent slots:", JSON.stringify(filteredSlots, null, 2));
    return filteredSlots;
};

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
        console.log("[DEBUG] Generated recurrence dates:", recurrenceDates);

        for (const staffServices of staffsServices) {
            const { staff, services } = staffServices;
            const staffId = staff._id;
            console.log(`[DEBUG] Processing staff ID: ${staffId}`);

            const staffData = await staffModel.findById(staffId)
                .populate('availability')
                .lean();
            if (!staffData || !staffData.availability) {
                console.log(`[DEBUG] No availability found for staff ${staffId}`);
                continue;
            }

            const workingDays = staffData.availability.availability;
            for (const recDateStr of recurrenceDates) {
                let currentDate = new Date(recDateStr);
                const dayName = currentDate.toLocaleString('en-US', { weekday: 'long' });
                const dayAvail = workingDays.find(a => a.day.toLowerCase() === dayName.toLowerCase());

                if (dayAvail && dayAvail.slots.length > 0) {
                    for (const slot of dayAvail.slots) {
                        const slotStart = parseTimeAMPM(slot.startTime, currentDate);
                        const slotEnd = parseTimeAMPM(slot.endTime, currentDate);
                        console.log(`[DEBUG] Checking slot from ${slotStart} to ${slotEnd} for staff ${staffId}`);

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

                                    console.log(`[DEBUG] Added available slot: ${slotStartTime} to ${slotEndTime}`);

                                    slotStartTime = new Date(slotEndTime.getTime());
                                }
                            }
                        });
                    }
                }
            }
        }

        availableSlots = filterConsistentSlots(availableSlots, recurrenceDates);
        console.log("[DEBUG] Available slots before merging:", JSON.stringify(availableSlots, null, 2));

        let mergedSlots = mergeSlots(Object.values(availableSlots).flat(), staffsServices.length);

        console.log("[DEBUG] Merged slots:", JSON.stringify(mergedSlots, null, 2));

        return res.status(200).json({
            message: 'Available slots generated successfully',
            mergedSlots,
        });

    } catch (error) {
        console.error("[ERROR] Failed to generate available slots:", error);
        return next(new AppError(`Failed to generate available slots: ${error.message}`, 500));
    }
};
