import mongoose from "mongoose";

const SubAppointmentSchema = new mongoose.Schema({
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
        required: true
    },
    services: [
        {
            serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
            duration: { type: Number, required: true } // Duration in minutes
        }
    ],
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    eventId: { type: String }, // Google Calendar Event ID
    status: {
        type: String,
        enum: ["Booked", "Cancelled", "Pending"],
        default: "Booked"
    }
}, { timestamps: true });

const AppointmentSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    status: {
        type: String,
        enum: ["Booked", "Cancelled", "Pending","Updated"],
        default: "Booked"
    },
    recurrence: {
        type: { type: String, enum: ["daily", "weekly", "monthly"], default: null },
        interval: { type: Number, default: 1 },
        endDate: { type: Date, default: null },
        count: { type: Number, default: 0 },
    },
    subAppointments: [SubAppointmentSchema] // Multiple sub-appointments for different staff
}, { timestamps: true });

export default mongoose.model("Appointment", AppointmentSchema);
