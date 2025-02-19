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
UserSchema.virtual("clients", {
    ref: "UserClient", // The model to use for the relation
    localField: "_id", // Field in the User model
    foreignField: "userId" // Field in the UserClient model
});

export default mongoose.model("User", UserSchema);
