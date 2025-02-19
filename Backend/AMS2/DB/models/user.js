import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phoneNumber: {

    },
    roleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role"
    },
    confirmed:{
        type:Boolean,
        default:false

    }
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
