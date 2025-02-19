import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema({
    admin: {
        type: Boolean
    },
    client: {
        type: Boolean
    },
    staff: {
        type: Boolean
    },
    customer: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export default mongoose.model("Role", RoleSchema);
