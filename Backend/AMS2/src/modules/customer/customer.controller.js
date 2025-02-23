import {AppError} from "../../utils/AppError.js";
import bcrypt from "bcrypt";
import  userModel from "../../../DB/models/user.js";
import UserClient from "../../../DB/models/ClientCustomer.js";

import mongoose from 'mongoose';
import {
    transCreateCustomer,
    transDeleteCustomer,
    transUpdateCustomer
} from "../../../DB/Controller/customer.DB.controller.js";

// when creating an Appointment assign customer to client
export const customerLocalRegister = async (req, res, next) => {
    const { userName, email, password, phoneNumber } = req.body;
    const filter = {}
    if(email) filter.email = email;
    if(phoneNumber) filter.phoneNumber = phoneNumber;
    let user = await userModel.findOne(filter)
    if(user) {
        return next(new AppError('User already exists', 401));
    }

    user = await transCreateCustomer({userName, email, phoneNumber, password:hashedPassword,authProvider: "local"})
    if(user instanceof AppError) return next(user);
    return res.status(201).json({ message: "Successfully created", user });

};
export const getClientCustomers = async (req, res, next) => {
        const {clientId} = req.params
        const userClients = await UserClient.find({ clientId: clientId });
        if (!userClients || userClients.length === 0) {

            return res.status(404).json({ message: "No customers found for this client" });

        }
        const userIds = userClients.map(userClient => userClient.userId);
        const customers = await userModel.find({ _id: { $in: userIds } }).populate("roleId");
        return res.status(200).json({ message: "success", customers });

};

export const updateCustomer = async (req, res, next) => {
    const { userName, email, password, phoneNumber } = req.body;
    const {customerId} = req.params

    const customer = await customerModel.findById(customerId);
    if (!customer) return next( new AppError("User doesn't exist", 401))

    const userData = {userName, email, phoneNumber,_id:customer.userId}
    if(password) userData.password = await bcrypt.hash(password, 8);

    const updatedCustomer = await transUpdateCustomer( userData);
    if (updatedCustomer instanceof AppError) {
        return next(updatedCustomer);
    }
    return res.json({message:"Customer updated successfully",updatedCustomer});
}


export const deleteCustomer = async (req, res, next) => {
    const { customerId } = req.params
    const id = req.authUser.id
    if(customerId !==id) return next( new AppError("User is not authorized for this action", 401));
    const deletedCustomer = await transDeleteCustomer(id)
    if (deletedCustomer instanceof AppError) {
        return next(deletedCustomer);
    }
    return res.status(200).json({message:"Successfully deleted", deletedCustomer});

}


