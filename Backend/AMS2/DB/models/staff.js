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
        type: mongoose.Schema.Types.ObjectId,
        ref: "Availability"
    },
    calendarId: {
        type: String
    },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }] // Array of services

}, { timestamps: true });

export default mongoose.model("Staff", StaffSchema);
