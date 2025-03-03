import { AppError } from '../../../utils/AppError.js';
import staffModel from '../../../../DB/models/staff.js';
import { getEvents } from '../../../utils/Google/events/getEvents.js';

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
        const  mergedSlots  = mergeSlots(availableSlots,staffsServices.length);
        return res.status(200).json({
            message: 'Available slots generated successfully',
            mergedSlots,
            availableSlots,
        });
    } catch (error) {
        return next(new AppError(`Failed to generate available slots: ${error.message}`, 500));
    }
};

function mergeSlots(slots,staffNumber) {
    slots.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    let mergedSlots = [];

    for (let i = 0; i < slots.length; i++) {
        let currentSlot = slots[i];
        let mergedSlot = {
            startTime: currentSlot.startTime,
            endTime: currentSlot.endTime,
            staffIds: [currentSlot.staffId],
        };

        for (let j = i + 1; j < slots.length; j++) {
            let nextSlot = slots[j];
            let currentEnd = new Date(mergedSlot.endTime);
            let nextStart = new Date(nextSlot.startTime);

            if (
                Math.abs(nextStart - currentEnd) <= 5 * 60 * 1000 &&
                !mergedSlot.staffIds.includes(nextSlot.staffId)
            ) {
                mergedSlot.endTime = nextSlot.endTime;
                mergedSlot.staffIds.push(nextSlot.staffId);
            }
        }

        mergedSlots.push(mergedSlot);
    }
     const slot = mergedSlots.filter((s)=> {
         return s.staffIds.length === staffNumber



     })
    return { slot};
}
