function mergeAdjacentSlots(slots) {
    // Step 1: Sort slots by start time
    slots.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    let mergedSlots = [];
    let currentSlot = null;

    // Step 2: Merge adjacent slots with different staff members
    for (let i = 0; i < slots.length; i++) {
        let slot = slots[i];

        // If the current slot is null, initialize it with the first slot
        if (!currentSlot) {
            currentSlot = {
                startTime: slot.startTime,
                endTime: slot.endTime,
                staffIds: [slot.staffId],
                duration: (new Date(slot.endTime) - new Date(slot.startTime)) / 1000 / 60 // duration in minutes
            };
            continue;
        }

        // Check if the current slot is adjacent to the next slot and has different staff
        if (currentSlot.endTime === slot.startTime && !currentSlot.staffIds.includes(slot.staffId)) {
            // Merge the slots: combine staffIds and update endTime
            currentSlot.endTime = slot.endTime;
            currentSlot.staffIds.push(slot.staffId);
            currentSlot.duration = (new Date(currentSlot.endTime) - new Date(currentSlot.startTime)) / 1000 / 60; // Update duration
        } else {
            // If the slot can't be merged, push the current merged slot and start a new one
            mergedSlots.push(currentSlot);
            currentSlot = {
                startTime: slot.startTime,
                endTime: slot.endTime,
                staffIds: [slot.staffId],
                duration: (new Date(slot.endTime) - new Date(slot.startTime)) / 1000 / 60
            };
        }
    }

    // Push the last slot
    if (currentSlot) {
        mergedSlots.push(currentSlot);
    }

    return mergedSlots;
}

// Example data:
const availableSlots = [
    { staffId: "67be52e6953fc2c80fc2eb72", startTime: "2025-03-12T07:00:00.000Z", endTime: "2025-03-12T08:30:00.000Z" },
    { staffId: "67be5424953fc2c80fc2eb84", startTime: "2025-03-12T07:00:00.000Z", endTime: "2025-03-12T07:30:00.000Z" },
    { staffId: "67be5424953fc2c80fc2eb84", startTime: "2025-03-12T07:30:00.000Z", endTime: "2025-03-12T08:00:00.000Z" },
    { staffId: "67be5424953fc2c80fc2eb84", startTime: "2025-03-12T08:00:00.000Z", endTime: "2025-03-12T08:30:00.000Z" },
    { staffId: "67be52e6953fc2c80fc2eb72", startTime: "2025-03-12T08:30:00.000Z", endTime: "2025-03-12T10:00:00.000Z" },
    { staffId: "67be5424953fc2c80fc2eb84", startTime: "2025-03-12T08:30:00.000Z", endTime: "2025-03-12T09:00:00.000Z" },
    { staffId: "67be5424953fc2c80fc2eb84", startTime: "2025-03-12T09:00:00.000Z", endTime: "2025-03-12T09:30:00.000Z" },
    { staffId: "67be5424953fc2c80fc2eb84", startTime: "2025-03-12T09:30:00.000Z", endTime: "2025-03-12T10:00:00.000Z" },
    { staffId: "67be5424953fc2c80fc2eb84", startTime: "2025-03-12T10:00:00.000Z", endTime: "2025-03-12T10:30:00.000Z" },
];

// Merge slots
const mergedSlots = mergeAdjacentSlots(availableSlots);
console.log("Merged Slots:", mergedSlots);
