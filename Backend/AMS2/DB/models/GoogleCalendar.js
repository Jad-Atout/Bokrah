import mongoose from "mongoose";

const googleModel = new mongoose.Schema({
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

export default mongoose.model("GoogleCalendar", googleModel);
