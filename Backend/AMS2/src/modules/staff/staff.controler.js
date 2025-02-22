import {AppError} from "../../utils/AppError.js";
import userModel from "../../../DB/models/user.js"
import staffModel from "../../../DB/models/staff.js"
import roleModel from "../../../DB/models/role.js"
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
    //TODO: check also the phone number if exists , also the return of the staff
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


const transDeleteStaff = async (staffId) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const staff = await staffModel.findById(staffId).session(session);
        if (!staff) {
            throw new AppError('Staff not found', 404);
        }

        // Check if user exists before proceeding
        const user = await userModel.findById(staff.userId).session(session);
        if (user) {
            await roleModel.findByIdAndDelete(user.roleId, { session });

            await userModel.findByIdAndDelete(staff.userId, { session });
        }

        await staffModel.findByIdAndDelete(staffId, { session });

        await session.commitTransaction();
        session.endSession();
        return { message: "Staff and related records successfully deleted" };
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return new AppError(err.message || 'Internal server error', 500);
    }
};

export const deleteStaff = async (req, res, next) => {
    try {
        const { staffId } = req.params;
        const result = await transDeleteStaff(staffId);
        if (result instanceof AppError) {
            return next(result);
        }
        return res.json(result);
    } catch (err) {
        return next(new AppError(err.message, 500));
    }
};


const transUpdateStaff = async (staffId, userData, staffData) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const staff = await staffModel.findById(staffId).session(session);
        if (!staff) {
            throw new AppError('Staff not found', 404);
        }

        await userModel.findByIdAndUpdate(staff.userId, userData, { session, new: true });
        await staffModel.findByIdAndUpdate(staffId, staffData, { session, new: true });

        await session.commitTransaction();
        session.endSession();
        return { message: "Staff successfully updated" };
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return new AppError(err.message || 'Internal server error', 500);
    }
};

export const updateStaff = async (req, res, next) => {
    try {
        const { staffId } = req.params;
        const { userName, email, phoneNumber, roleDescription } = req.body;

        const result = await transUpdateStaff(staffId, { userName, email, phoneNumber }, { roleDescription });
        if (result instanceof AppError) {
            return next(result);
        }
        return res.json(result);
    } catch (err) {
        return next(new AppError(err.message, 500));
    }
};