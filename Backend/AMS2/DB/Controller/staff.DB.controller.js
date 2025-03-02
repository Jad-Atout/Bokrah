import mongoose from "mongoose";
import {createRole} from "./role.controller.js";
import userModel from "../models/user.js";
import staffModel from "../models/staff.js";
import {AppError} from "../../src/utils/AppError.js";
import roleModel from "../models/role.js";
import getOrCreateSubCalendar from "../../src/utils/Google/Services/calendarManagement.js";
//TODO fixing returs for appERRor in delete and update
//TODO if a user exists make it staff ?
export const transCreateStaff = async (userData,staffData,oauth2Client)=>{

    const session = await mongoose.startSession(); // Start a session
    session.startTransaction();
    try {
        const checkUserExistence = await userModel.find({
            $or: [
                { email: userData.email },
                { phoneNumber: userData.phoneNumber }
            ]
        }).session(session);
        if (checkUserExistence.length !==0) {
            return {staff:null,user:null,appError:new AppError('User already exists', 409)}
        }

        const role = await createRole({ staff: true }, session);
        userData.roleId = role._id;

        const user = new userModel(userData)

        await user.save({ session });
        staffData.userId = user._id

        const staff= new staffModel(staffData);
        await staff.save({session})

        staff.calendarId = await getOrCreateSubCalendar(oauth2Client, staff.id,user.userName);
        await staff.save({session})


        await session.commitTransaction();
        session.endSession();
        return {staff:staff, user:user,appError:null}

    }catch (err){
        await session.abortTransaction();
        session.endSession();
        return new AppError(err.message || 'Internal server error', 500);
    }
}


export const transDeleteStaff = async (staffId) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {

        const staff = await staffModel.findById(staffId).session(session);
        if (!staff) return  new AppError('Staff not found', 404);

        const user = await userModel.findById(staff.userId).session(session);

        await roleModel.findByIdAndDelete(user.roleId, { session });
        await userModel.findByIdAndDelete(staff.userId, { session });
        await staffModel.findByIdAndDelete(staffId, { session });
        //TODO delete him from services

        await session.commitTransaction();
        session.endSession();

        return { message: "Staff and related records successfully deleted" };
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
         return  new AppError(err.message || 'Internal server error', 500);

    }
};

export const transUpdateStaff = async (staffId, userData, staffData) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const staff = await staffModel.findById(staffId).session(session);
        if (!staff) return  new AppError('Staff not found', 404);

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