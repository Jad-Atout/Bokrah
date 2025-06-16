import mongoose from "mongoose";

const WebsiteSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true,
        onDelete: "cascade"
    },
    industry: {
        type: String,
        required: false
    },
    businessName: {
        type: String,
        required: false
    },
    availability_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Availability",
        required: true
    }
    ,
    websiteUrls: [{
        type: String,
        required: false
    }],
    instagramUrl: {
        type: String,
        required: false
    },
    facebookUrl: {
        type: String,
        required: false
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
}, { timestamps: true });

export default mongoose.model("Website", WebsiteSchema);
