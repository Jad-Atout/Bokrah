import mongoose from "mongoose";
const userModel = new mongoose.Schema({
    userName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: function() {
            return this.authProvider === "local";
        }
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
        unique: true,
        sparse: true
    },
    roleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
        onDelete: "cascade"
    },
    confirmed:{
        type:Boolean,
        default:true
    } , sendCode:{
        type:String,
    },
}, { timestamps: true });
userModel.virtual("clients", {
    ref: "UserClient", // The model to use for the relation
    localField: "_id", // Field in the User model
    foreignField: "userId", // Field in the UserClient model
    onDelete: "cascade"
});

export default mongoose.model("User", userModel);
