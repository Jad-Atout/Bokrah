import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        onDelete:"cascade",
    },
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
    customWebsiteName: {
        type: String,
        required: false,
        unique: true
    },
    website: {
        type: String,
        required: false,
        unique: true
    }
}, { timestamps: true });

export default mongoose.model("Client", ClientSchema);
