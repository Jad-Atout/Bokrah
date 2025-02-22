import mongoose from "mongoose";

const UserClient = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer",
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true
    }
}, { timestamps: true });

export default mongoose.model("UserClient", UserClient);
