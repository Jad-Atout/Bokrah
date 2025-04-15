import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    type: {
        type: String,
        enum: ["Appointment", "Announcement", "Subscription", "System"],
        default: "Appointment"
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    referencedId: {
        type: mongoose.Schema.Types.ObjectId,
    },
    // Who/what triggered this notification: Customer, Provider, System, etc.
    triggeredBy: {
        type: String,
        default: ""
    }
}, { timestamps: true });

export default mongoose.model("Notification", notificationSchema);
