function mergeStaffAvailability(availableSlots) {
    // Flatten the available slots with staff IDs
    let allSlots = [];
    availableSlots.forEach(staff => {
        staff.slots.forEach(slot => {
            allSlots.push({
                startTime: new Date(slot.startTime),
                endTime: new Date(slot.endTime),
                staffId: staff.staffId,
            });
        });
    });

    // Sort all slots by startTime
    allSlots.sort((a, b) => a.startTime - b.startTime);

    // Generate all unique time points (starts and ends)
    const timePoints = [];
    allSlots.forEach(slot => {
        timePoints.push({ time: slot.startTime, isStart: true, staffId: slot.staffId });
        timePoints.push({ time: slot.endTime, isStart: false, staffId: slot.staffId });
    });

    // Sort time points chronologically
    timePoints.sort((a, b) => {
        if (a.time.getTime() !== b.time.getTime()) {
            return a.time.getTime() - b.time.getTime();
        }
        // If times are equal, end points come before start points
        return a.isStart ? 1 : -1;
    });

    // Track active staff
    const activeStaff = new Set();
    const timeSegments = [];
    let previousTime = null;

    // Generate all time segments with their active staff
    timePoints.forEach(point => {
        // If we have a previous time point, create a segment
        if (previousTime !== null) {
            // Only create a segment if time has actually advanced
            if (previousTime.getTime() < point.time.getTime()) {
                timeSegments.push({
                    startTime: new Date(previousTime),
                    endTime: new Date(point.time),
                    staffIds: Array.from(activeStaff)
                });
            }
        }

        // Update the set of active staff
        if (point.isStart) {
            activeStaff.add(point.staffId);
        } else {
            activeStaff.delete(point.staffId);
        }

        previousTime = point.time;
    });

    // Filter segments to only include those with at least 2 staff members
    const multiStaffSegments = timeSegments.filter(segment => segment.staffIds.length >= 2);

    // Merge adjacent segments with the same staff composition
    const mergedSlots = [];
    let currentMergedSlot = null;

    multiStaffSegments.forEach(segment => {
        if (currentMergedSlot === null) {
            currentMergedSlot = { ...segment };
        } else {
            const sameStaff =
                segment.staffIds.length === currentMergedSlot.staffIds.length &&
                segment.staffIds.every(id => currentMergedSlot.staffIds.includes(id));

            // Check if this segment starts exactly when the previous one ends
            const isConsecutive =
                segment.startTime.getTime() === currentMergedSlot.endTime.getTime();

            if (isConsecutive && sameStaff) {
                // Extend the current merged slot
                currentMergedSlot.endTime = segment.endTime;
            } else {
                // Add the current merged slot to the result and start a new one
                mergedSlots.push(currentMergedSlot);
                currentMergedSlot = { ...segment };
            }
        }
    });

    // Don't forget to add the last merged slot
    if (currentMergedSlot !== null) {
        mergedSlots.push(currentMergedSlot);
    }

    return mergedSlots;
}

// Testing with the provided data
const availableSlots = [
    {
        staffId: "67be52e6953fc2c80fc2eb72",
        slots: [
            { startTime: "2025-03-12T07:00:00.000Z", endTime: "2025-03-12T08:30:00.000Z" },
            { startTime: "2025-03-12T08:30:00.000Z", endTime: "2025-03-12T10:00:00.000Z" },
            { startTime: "2025-03-12T11:30:00.000Z", endTime: "2025-03-12T13:00:00.000Z" },
            { startTime: "2025-03-12T13:00:00.000Z", endTime: "2025-03-12T14:30:00.000Z" }
        ]
    },
    {
        staffId: "67be5424953fc2c80fc2eb84",
        slots: [
            { startTime: "2025-03-12T07:00:00.000Z", endTime: "2025-03-12T07:30:00.000Z" },
            { startTime: "2025-03-12T07:30:00.000Z", endTime: "2025-03-12T08:00:00.000Z" },
            { startTime: "2025-03-12T08:00:00.000Z", endTime: "2025-03-12T08:30:00.000Z" },
            { startTime: "2025-03-12T08:30:00.000Z", endTime: "2025-03-12T09:00:00.000Z" },
            { startTime: "2025-03-12T09:00:00.000Z", endTime: "2025-03-12T09:30:00.000Z" },
            { startTime: "2025-03-12T09:30:00.000Z", endTime: "2025-03-12T10:00:00.000Z" },
            { startTime: "2025-03-12T10:00:00.000Z", endTime: "2025-03-12T10:30:00.000Z" },
            { startTime: "2025-03-12T10:30:00.000Z", endTime: "2025-03-12T11:00:00.000Z" },
            { startTime: "2025-03-12T11:00:00.000Z", endTime: "2025-03-12T11:30:00.000Z" },
            { startTime: "2025-03-12T12:00:00.000Z", endTime: "2025-03-12T12:30:00.000Z" },
            { startTime: "2025-03-12T12:30:00.000Z", endTime: "2025-03-12T13:00:00.000Z" },
            { startTime: "2025-03-12T13:00:00.000Z", endTime: "2025-03-12T13:30:00.000Z" },
            { startTime: "2025-03-12T13:30:00.000Z", endTime: "2025-03-12T14:00:00.000Z" },
            { startTime: "2025-03-12T14:00:00.000Z", endTime: "2025-03-12T14:30:00.000Z" },
            { startTime: "2025-03-12T14:30:00.000Z", endTime: "2025-03-12T15:00:00.000Z" }
        ]
    }
];

// Call merge function
const mergedSlots = mergeStaffAvailability(availableSlots);

// Output the result
console.log('Consecutive Merged Slots with Multiple Staff:');
mergedSlots.forEach((slot, index) => {
    console.log(`Slot ${index + 1}:`, {
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        staffIds: slot.staffIds,
        duration: (slot.endTime - slot.startTime) / (1000 * 60) + ' minutes'
    });
});
