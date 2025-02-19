import mongoose from "mongoose";

const RecurrenceSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["Weekly", "Monthly", "Daily"],
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    numberOfRecurrences: {
        type: Number
    },
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment"
    }
}, { timestamps: true });

export default mongoose.model("Recurrence", RecurrenceSchema);
