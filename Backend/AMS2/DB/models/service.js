import mongoose from "mongoose";

const ServiceSchema = new mongoose.Schema({
    serviceName: {
        type: String,
        required: true
    },
    serviceDescription: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        default: 0
    },
    duration: {
        type: Number,
        default: 30
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client"
    },
    staff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }] // Array of staff

}, { timestamps: true });

export default mongoose.model("Service", ServiceSchema);
