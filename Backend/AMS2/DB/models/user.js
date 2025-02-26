import mongoose from "mongoose";
const userModel = new mongoose.Schema({
    userName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },   password: {
        type: String,
        required: function() {
            return this.authProvider === "local";
        },
        default: null // Ensure non-local providers don't trigger validation errors
    }
    ,
    authProvider: {
        type: String,
        enum: ["local", "google","actor"],
        required: true,
        default: "local"
    },
    phoneNumber: {
        type:String,
        unique: true
    },
    roleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
        onDelete: "cascade"
    },
    confirmed:{
        type:Boolean,
        default:false
    } , sendCode:{
        type:String,
        default:null,
    },
}, { timestamps: true });
userModel.virtual("clients", {
    ref: "UserClient", // The model to use for the relation
    localField: "_id", // Field in the User model
    foreignField: "userId", // Field in the UserClient model
    onDelete: "cascade"
});

export default mongoose.model("User", userModel);
