import mongoose from "mongoose";

const userNotificationPreferenceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, required: true },
    preferences: {
        Appointment: {
            push: { type: Boolean, default: true }, // standard notifications
            reminderChannels: {
                email: { type: Boolean, default: true },
                sms: { type: Boolean, default: false },
                push: { type: Boolean, default: true },
            }
        },
        Announcement: { push: { type: Boolean, default: true } },
        Subscription: { push: { type: Boolean, default: true } },
        System: { push: { type: Boolean, default: true } },
    }
});
export default mongoose.model("UserNotificationPreference", userNotificationPreferenceSchema);