import mongoose from "mongoose";
//TODO make the phone number unique
const userModel = new mongoose.Schema({
    userName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true
    },    password: {
        type: String,
        required: function() {
            let req= false
            if(this.authProvider==="local"){
                req=true;
            }
            return req;
        }
    },
    authProvider: {
        type: String,
        enum: ["local", "google","actor"],
        required: true,
        default: "local"
    },
    phoneNumber: {

    },
    roleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
        onDelete: "cascade"
    },
    confirmed:{
        type:Boolean,
        default:false

    }
}, { timestamps: true });
userModel.virtual("clients", {
    ref: "UserClient", // The model to use for the relation
    localField: "_id", // Field in the User model
    foreignField: "userId", // Field in the UserClient model
    onDelete: "cascade"
});

export default mongoose.model("User", userModel);
