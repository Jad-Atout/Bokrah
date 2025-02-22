import {AppError} from "../../utils/AppError.js";
import bcrypt from "bcrypt";
import  userModel from "../../../DB/models/user.js";
import UserClient from "../../../DB/models/ClientCustomer.js";

import mongoose from 'mongoose';

// when creating an Appointment assign customer to client
export const createCustomer = async (req, res, next) => {
    try {
        if (req.user) {
            return next(new AppError("User already exists!", 409));
        }

        const { userName, email, password, phoneNumber } = req.body;
        const hashedPassword = await bcrypt.hash(password, 8);

        const user = await userModel.create({
            userName,
            email,
            password: hashedPassword,
            phoneNumber
        });

     //   const customer = await CustomerModel.create({
     //       userId: user._id
     //   });

        return res.status(201).json({ message: "Successfully created", user });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
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


