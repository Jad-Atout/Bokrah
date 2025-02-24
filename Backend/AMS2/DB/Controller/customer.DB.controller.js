import userModel from '../models/user.js';
import mongoose from "mongoose";
import roleModel from "../models/role.js";
import customerModel from "../models/customer.js";

import {AppError} from "../../src/utils/AppError.js";

export const transCreateCustomer = async(customerData) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const role = await roleModel({customer:true})
        await role.save({session})
        customerData.roleId = role._id;
        const user = new userModel(customerData)
        await user.save({ session });
        const customer = new customerModel({userId:user._id})
        await customer.save({session})
        await session.commitTransaction();
        session.endSession();
        return user
    }catch (err){
        await session.abortTransaction();
        session.endSession();
        return new AppError(err.message || 'Internal server error', 500);
    }
}
export const transUpdateCustomer =async (userData,customerData=null) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await userModel.findByIdAndUpdate(userData._id, userData);
        if(customerData) await customerModel.findByIdAndUpdate(customerData._id,customerData)
        return user
    }catch (err){
        await session.abortTransaction();
        session.endSession();
        return new AppError(err.message || 'Internal server error', 500);
    }
}
export const transDeleteCustomer = async (customerId) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const customer = await customerModel.findByIdAndDelete(customerId)
        if(!customer) return new AppError("Customer doesn't exists", 401);
        const user =await userModel.findByIdAndDelete(customer.userId)
        await roleModel.findByIdAndDelete(user.roleId)
    }catch (err){
        await session.abortTransaction();
        session.endSession();
        return new AppError(err.message || 'Internal server error', 500);
    }
}