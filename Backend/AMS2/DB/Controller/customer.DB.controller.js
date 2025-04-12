import userModel from '../models/user.js';
import mongoose from "mongoose";
import roleModel from "../models/role.js";
import customerModel from "../models/customer.js";
import {AppError} from "../../src/utils/AppError.js";


export const transCreateCustomer = async (customerData) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        let user
        if(customerData.userId) {
            user =  await userModel.findById(customerData.userId)
            await roleModel.findByIdAndUpdate(user.roleId,{newCustomer: true},{session})
            await user.save({session});


        }else {
            const role = new roleModel({customer:true})
            await role.save({session})
            customerData.roleId = role._id;
            user = new userModel(customerData)
            await user.save({session})

        }
        const customer = new customerModel({userId: user._id})
        await customer.save({session})

        await session.commitTransaction();
        session.endSession();
            return { user, customer, appError: null };
        } catch (err) {
        console.log(err)
        await session.abortTransaction();
        session.endSession();

        return  new AppError(err.message || "Internal server error", 500);
    }
};




export const transUpdateCustomer =async (userData,customerData=null) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await userModel.findByIdAndUpdate(userData._id, userData,{ session, new: true });
        if(customerData) await customerModel.findByIdAndUpdate(customerData._id,customerData,{ session, new: true })

        await session.commitTransaction();
        session.endSession();

        return {user,customer:null,appError:null}
    }catch (err){
        await session.abortTransaction();
        session.endSession();
        return {user:null,customer:null,appError:new AppError(err.message || 'Internal server error', 500)}
    }
}
export const transDeleteCustomer = async (customerId) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        let user = null;
        let customer = null;

        customer = await customerModel.findById(customerId).populate({
            path: "userId",
            ref: "user"
        });

        if (!customer) return new AppError("Customer doesn't exist", 401);

        const role = await roleModel.findById(customer.userId.roleId);

        if (!role.staff && !role.client && !role.admin) {
            user = await userModel.findByIdAndDelete(customer.userId._id, { session });
            await roleModel.updateOne(
                { _id: role._id },
                { $unset: { customer: "" } },
                { session });
        } else {
            await customerModel.findByIdAndDelete(customer._id, { session });
            role.customer = false;
            await role.save({ session });
        }

        await session.commitTransaction();
        session.endSession();
        return { user, customer, appError: null };

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return {
            user: null,
            customer: null,
            appError: new AppError(err.message || 'Internal server error', 500)
        };
    }
};
