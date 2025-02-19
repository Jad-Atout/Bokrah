import mongoose from "mongoose";

const ReminderSchema = new mongoose.Schema({
    message: {
        type: String,
        default: "You have an appointment with Jad Atout"
    },
    scheduledTime: {
        type: Date,
        required: true
    },
    deliveryMethod: {
        type: String,
        enum: ["Email", "SMS"],
        default: "Email"
    }
}, { timestamps: true });

export default mongoose.model("Reminder", ReminderSchema);
