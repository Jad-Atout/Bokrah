import staffModel from "../../../../DB/models/staff.js"; // Assuming the availability model is here

//TODO availabilty AM / PM
export const checkInternalAvailability = async (staffId, startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const staff = await staffModel.findById(staffId)
        .populate('availability')
        .exec();

    if (!staff || !staff.availability) {
        return false;
    }

    const startTimeInMinutes = start.getHours() * 60 + start.getMinutes();
    const endTimeInMinutes = end.getHours() * 60 + end.getMinutes();

    const dayOfWeek = start.toLocaleString('en-us', { weekday: 'long' }).toLowerCase(); // Get the day of the week in lowercase

    const dayAvailability = staff.availability.availability.find(a => a.day.toLowerCase() === dayOfWeek);
    if (!dayAvailability) {
        return false;
    }

    return dayAvailability.slots.some(slot => {
        const slotStart = parseTime(slot.startTime);
        const slotEnd = parseTime(slot.endTime);


        return (startTimeInMinutes >= slotStart && endTimeInMinutes <= slotEnd);
    });
};

const parseTime = (timeStr) => {
    const [time, modifier] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);

    if (modifier === "PM" && hours < 12) {
        hours += 12; // Convert PM times to 24-hour format
    }
    if (modifier === "AM" && hours === 12) {
        hours = 0; // Convert 12 AM to 00:00
    }

    return hours * 60 + minutes;
};
export const calculateEndTime = (startTime, services) => {
    let totalDuration = services.reduce((acc, service) => acc + service.duration, 0);
    return new Date(new Date(startTime).getTime() + totalDuration * 60000).toISOString();
};



export const generateRecurringDates = (startTime, recurrence) => {
    let dates = [startTime];
    console.log(startTime)
    if (!recurrence || !recurrence.type || recurrence.count <= 1) return dates;
    let currentDate = new Date(startTime);
    console.log(currentDate)
    for (let i = 1; i < recurrence.count; i++) {
        if (recurrence.type === "daily") currentDate.setDate(currentDate.getDate() + recurrence.interval);
        else if (recurrence.type === "weekly") currentDate.setDate(currentDate.getDate() + recurrence.interval * 7);
        else if (recurrence.type === "monthly") currentDate.setMonth(currentDate.getMonth() + recurrence.interval);
        dates.push(currentDate.toISOString());
    }
    return dates;
};