import {AppError} from "../../utils/AppError.js";
import userModel from "../../../DB/models/user.js"
import staffModel from "../../../DB/models/staff.js"
import {createRole} from "../../../DB/Controller/role.controller.js";
import mongoose from 'mongoose';


const transCreateStaff = async (userData,staffData)=>{
    const session = await mongoose.startSession(); // Start a session
    session.startTransaction();
    try {
        const role = await createRole({ staff: true }, session);
        userData.roleId = role._id;
        const user = await userModel.create(userData, { session });
        staffData.userId = user._id
        const staff=await staffModel.create(staffData,{session});
        await session.commitTransaction();
        session.endSession();
        return staff
    }catch (err){
        await session.abortTransaction();
        session.endSession();
        return new AppError(err.message || 'Internal server error', 500);
    }
}


export const createStaff = async (req, res, next) => {
    const { userName, email, phoneNumber, roleDescription } = req.body;
    const { clientId } = req.authUser;
        // Check if the user already exists
        const checkUserExistence = await userModel.findOne({ email: email });
        if (checkUserExistence) {
            throw new AppError('User already exists', 409);
        }
   await transCreateStaff(
        [{ userName, email, phoneNumber, authProvider: "actor" }],
        [{ clientId, roleDescription }],
    )
    return res.json({ message: "Staff successfully created"});
};
export const getClientStaff = async (req, res, next) => {
    const { clientId } = req.params
    const staffs = await staffModel.find({clientId: clientId})
    return res.json({message:"success",staffs},200)
}
