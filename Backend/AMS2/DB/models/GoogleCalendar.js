import mongoose from "mongoose";

const GoogleCalendarSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true
    },
    accessToken: {
        type: String,
        required: true
    },
    refreshToken: {
        type: String,
        required: true
    }
}, { timestamps: true });

export default mongoose.model("GoogleCalendar", GoogleCalendarSchema);
