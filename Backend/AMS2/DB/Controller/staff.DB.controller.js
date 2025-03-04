import mongoose from "mongoose";
import {createRole} from "./role.controller.js";
import userModel from "../models/user.js";
import staffModel from "../models/staff.js";
import {AppError} from "../../src/utils/AppError.js";
import roleModel from "../models/role.js";
import getOrCreateSubCalendar, {deleteCalendar} from "../../src/utils/Google/Services/calendarManagement.js";
import serviceModel from "../models/service.js";
import appointmentModel from "../models/appointment.js";
export const populateStaff = [
    {
        path:"userId",
        ref:"user",
        select:"userName email phoneNumber ",
    },
    {
        path: "clientId",
        ref: "client",
        populate:{
            path:"userId",
            ref:"user",
            select:"userName email phoneNumber roleId"
        }
    },
    {
        path:"services",
        ref:"service",
        select: "serviceName"
    },
]

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
        let role = null
        let user = null

        if(checkUserExistence.length > 1)  return {staff:null,user:null,appError:new AppError('Email or phone number belongs to different users', 409)}
        if(checkUserExistence.length ===0){
            role = await createRole({ staff: true }, session);
            userData.roleId = role._id;

            user = new userModel(userData)
            await user.save({ session });

        }else {
            user = checkUserExistence[0]
            role = await roleModel.findById(user.roleId)
            if(role.staff || role.client) return {staff:null,user:null,appError:new AppError('Staff already exists in the system', 409)}

            role.staff = true
            await role.save({session});
        }

        staffData.userId = user._id

        let staff= new staffModel(staffData);
        await staff.save({session})

        staff.calendarId = await getOrCreateSubCalendar(oauth2Client,user.userName);
        await staff.save({session})

        staff = await staffModel.findById(staff._id).populate(populateStaff).session(session);


        await session.commitTransaction();
        session.endSession();

        return {staff:staff,user,appError:null}

    }catch (err){
        await session.abortTransaction();
        session.endSession();
        return new AppError(err.message || 'Internal server error', 500);
    }
}


export const transDeleteStaff = async (staff,oauth2Client) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {

        const appointments = await appointmentModel.find({
            "subAppointments.staffId": staff._id,
            status:"Booked"
        },{
            _id: 1
        }).session(session);

        if(appointments.length > 0) return {appError:new AppError('Staff has appointments please cancel or edit them', 404),staff:null,appointmentIds:appointments}

        const user = await userModel.findById(staff.userId)
        await roleModel.findByIdAndUpdate(user.roleId,{staff: false}, { session });

        staff=await staffModel.findByIdAndDelete(staff._id, { session }).populate(populateStaff);
        await serviceModel.updateMany({staff:staff._id},{$pull:{staff:staff._id}},{session});
        await deleteCalendar(oauth2Client,staff.calendarId)

        await session.commitTransaction();
        session.endSession();

        return {appError:null,staff,appointmentIds:null}
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return {appError:new AppError(err.message || 'Internal server error', 500),staff:null,appointmentIds:null}

    }
};

export const transUpdateStaff = async (staff, userData, staffData) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {

        await userModel.findByIdAndUpdate(staff.userId, userData, { session, new: true });
        staff = await staffModel.findByIdAndUpdate(staff._id, staffData, { session, new: true }).populate(populateStaff).session(session);
        await session.commitTransaction();
        session.endSession();
        return {appError:null,staff}
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return {appError:new AppError(err.message || 'Internal server error', 500),staff:null} ;
    }
};