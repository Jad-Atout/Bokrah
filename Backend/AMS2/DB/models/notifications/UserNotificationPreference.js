import mongoose from "mongoose";

const channelPreferenceSchema = new mongoose.Schema({
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
}, { _id: false });


const notificationPreferenceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true,
        ref: 'User',
    },
    preferences: {
        appointmentReminder: { type: channelPreferenceSchema, default: () => ({}) },
        appointmentChange: { type: channelPreferenceSchema, default: () => ({}) }, // grouped creation/update/cancellation
    }
}, {
    timestamps: true,
});
export default mongoose.model("notificationPreferenceSchema", notificationPreferenceSchema);