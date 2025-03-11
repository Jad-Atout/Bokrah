import mongoose from "mongoose";

const appointmentReminderSchema = new mongoose.Schema({
    appointmentId: { type: String, required: true, index: true },
    reminderTime: { type: Date, required: true },
    method: { type: String, enum: ["email"], required: true },
    email: { type: String, required: false },
    userName: { type: String, required: true },
    staffNames: { type: [String], required: true },
    allServices: { type: [String], required: true },
    clientId: { type: String, required: true },
    isExecuted: { type: Boolean, default: false },
});

export default mongoose.model("AppointmentReminderJob", appointmentReminderSchema);
