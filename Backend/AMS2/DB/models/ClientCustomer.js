import mongoose from "mongoose";
//TODO: client block newCustomer if he absent for more than three times
const UserClient = new mongoose.Schema({
    customerId: {
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
