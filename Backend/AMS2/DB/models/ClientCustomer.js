import mongoose from "mongoose";
//TODO: client block customer if he absent for more than three times
const UserClient = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true
    }
}, { timestamps: true });

export default mongoose.model("UserClient", UserClient);
