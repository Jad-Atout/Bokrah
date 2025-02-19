import {AppError} from "../../ults/AppError.js";
import bcrypt from "bcrypt";
import  userModel from "../../../DB/models/user.js";

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

        return res.status(201).json({ message: "Successfully created", user });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};
export const getAllCustomers = async (req, res, next) => {
    try {
        const customers = await userModel.find().populate("roleId"); // Fix: Mongoose uses `find()`

        return res.status(200).json({ message: "success", customers });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};