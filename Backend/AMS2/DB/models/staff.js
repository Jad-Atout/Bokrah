import mongoose from "mongoose";

const StaffSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client"
    },
    roleDescription: {
        type: String
    },
    availability: {
        type: String
    },
    calendarId: {
        type: String
    }
}, { timestamps: true });

export default mongoose.model("Staff", StaffSchema);
