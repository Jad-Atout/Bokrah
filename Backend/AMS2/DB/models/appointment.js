import mongoose from "mongoose";

const AppointmentSchema = new mongoose.Schema({
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["Booked", "Cancelled", "Pending"],
        default: "Booked",
        required: true
    },
    eventId: {
        type: String
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client"
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff"
    },
    services: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Service"
        }
    ]
}, { timestamps: true });

export default mongoose.model("Appointment", AppointmentSchema);
