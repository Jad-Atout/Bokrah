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
        type: Object,
    },
    secondaryImage: {
        type: Object,
    },
    mainImage: {
        type: Object,
    },
    headerText:{
        type: String,
    },
    headerDescription: {
        type: String,
    },
    aboutHeaderText: {
        type: String,
    },
    aboutDescription: {
        type: String,
    },
    teamDescription: {
        type: String,
    }
});

export default mongoose.model("Website", websiteSchema);
