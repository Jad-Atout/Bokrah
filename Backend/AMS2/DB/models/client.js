import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        onDelete:"cascade",
    },
    industry: {
        type: String,
        required: false,
    },
    businessName: {
        type: String,
        required: false
    },
    websiteUrls: [{
        type: String,
        required: false
    }],
    about: {
        type: String,
        required: false
    },
    city: {
        type: String,
        required: false
    },
    address: {
        type: String,
        required: false
    },
    instagramUrl: {
        type: String,
        required: false
    },
    facebookUrl: {
        type: String,
        required: false
    }
}, { timestamps: true });

export default mongoose.model("Client", ClientSchema);
