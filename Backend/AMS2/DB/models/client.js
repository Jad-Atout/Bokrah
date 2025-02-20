import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    industry: {
        type: String,
        required: false,
    },
    businessName: {
        type: String,
        required: false
    }
}, { timestamps: true });

export default mongoose.model("Client", ClientSchema);
