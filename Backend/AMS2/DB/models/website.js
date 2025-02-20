import mongoose from "mongoose";

const websiteSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true
    },
    websiteURL: {
        type: String,
        required: true
    },
    logo: {
        type: String
    },
    backgroundPic: {
        type: String
    }
}, { timestamps: true });

export default mongoose.model("Website", websiteSchema);
