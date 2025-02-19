import mongoose from "mongoose";

const AppointmentServiceSchema = new mongoose.Schema({
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
        required: true
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true
    }
}, { timestamps: false });

export default mongoose.model("AppointmentService", AppointmentServiceSchema);
