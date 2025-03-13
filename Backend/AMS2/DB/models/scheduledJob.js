import mongoose from "mongoose";

const scheduledJobSchema = new mongoose.Schema({
    jobType: { type: String, required: true, enum: ["appointmentReminder", "subscriptionCheck", "subAppointmentEnd"] },
    referenceId: { type: String, required: true },
    scheduledTime: { type: Date, required: true },
});

export default mongoose.model("ScheduledJob", scheduledJobSchema);
