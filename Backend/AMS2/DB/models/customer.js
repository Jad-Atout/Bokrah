import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true, // Ensures each User has only one Customer
    },
}, );

export default mongoose.models.Customer || mongoose.model("Customer", customerSchema);
