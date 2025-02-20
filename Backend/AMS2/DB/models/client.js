import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        onDelete:"cascade",
    },
    industry: {
        type: String,
        required: true,
    },
    businessName: {
        type: String,
        required: true
    }
}, { timestamps: true });

export default mongoose.model("Client", ClientSchema);
