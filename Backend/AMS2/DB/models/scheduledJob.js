import mongoose from "mongoose";

const scheduledJobSchema = new mongoose.Schema({
    jobType: { type: String, required: true, enum: ["appointmentReminder", "subscriptionCheck", "subAppointmentEnd"] },
    referenceId: { type: String, required: true }, // Links to specific job data (e.g., appointmentId)
    scheduledTime: { type: Date, required: true },
    status: { type: String, enum: ["pending", "executed", "failed"], default: "pending" },
    executedAt: { type: Date },
    failureReason: { type: String },
});

export default mongoose.model("ScheduledJob", scheduledJobSchema);
