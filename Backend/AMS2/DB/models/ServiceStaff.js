import mongoose from "mongoose";

const ServicesStaffSchema = new mongoose.Schema({
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Staff",
        required: true
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true
    }
}, { timestamps: false });

export default mongoose.model("ServicesStaff", ServicesStaffSchema);
