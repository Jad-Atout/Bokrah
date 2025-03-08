import {AppError} from "../../utils/AppError.js";
import bcrypt from "bcrypt";
import  userModel from "../../../DB/models/user.js";
import UserClient from "../../../DB/models/ClientCustomer.js";
import customerModel from "../../../DB/models/Customer.js";
import dotenv from "dotenv";
import {
    transCreateCustomer,
    transDeleteCustomer,
    transUpdateCustomer
} from "../../../DB/Controller/customer.DB.controller.js";
import {sendEmail} from "../../utils/email.js";
import {setPasswordEmailTemplate, welcomeEmailTemplate} from "../../utils/emailTemplete.js";
import jwt from "jsonwebtoken";
dotenv.config()

// login directry after confirmation



export const createCustomer = async (req, res, next) => {
    const { userName, email, phoneNumber } = req.body;
    const filter = {}
    if(email) filter.email = email;
    if(phoneNumber) filter.phoneNumber = phoneNumber;
    let user = await userModel.findOne(filter)
    if(user) return res.status(400).json({ message: "User already exists", user });

    let {newUser,customer,appError} = await transCreateCustomer({userName, email, phoneNumber,authProvider: "actor"})

    if(appError) return next(appError);
    const tokenData={id:newUser._id, email:newUser.email,}
    const token = jwt.sign(tokenData, process.env.JWT_CONFIRME_SECRET);
    await sendEmail(newUser.email,  "Welcome",
        await welcomeEmailTemplate( newUser.userName, token)
    );
    await sendEmail(newUser.email,  "Set Your Password & Confirm Your Email",
        await setPasswordEmailTemplate( newUser.userName, token))
    return res.status(201).json({ message: "Successfully created", user,customer });
};



export const customerRegister = async (req, res, next) => {
    const { userName, email, password, phoneNumber } = req.body;
    const filter = {}
    if(email) filter.email = email;
    if(phoneNumber) filter.phoneNumber = phoneNumber;
    let user = await userModel.findOne(filter)
    if(user) {
        return next(new AppError('User already exists', 401));
    }

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT_ROUND));
    let {newUser,customer,appError} = await transCreateCustomer({userName, email, phoneNumber, password:hashedPassword,authProvider: "local"})
    if(appError) return next(appError);

    const tokenData={id:user._id, email:user.email,}
    const token = jwt.sign(tokenData, process.env.JWT_CONFIRME_SECRET);

    await sendEmail(newUser.email,  "Welcome",
        await welcomeEmailTemplate( newUser.userName, token)
    );
    return res.status(201).json({ message: "Successfully created", newUser,customer });
};

export const getClientCustomers = async (req, res, next) => {
    try {
        const { clientId } = req.params;

        const userClient = await UserClient.find({ clientId });
        if (!userClient || userClient.length === 0) {
            return res.status(404).json({
                message: "No customers found for this client",
                customers: [],
            });
        }

        const customerIds = userClient.map((uc) => uc.customerId);

        const customers = await customerModel.find({ _id: { $in: customerIds } })
            .populate({
                path: "userId",
                select: "userName email phoneNumber",
            });

        return res.status(200).json({
            message: "success",
            customers,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const updateCustomer = async (req, res, next) => {
    const { userName, email, password, phoneNumber } = req.body;
    const {customerId} = req.params

    const customer = await customerModel.findById(customerId);
    if (!customer) return next( new AppError("User doesn't exist", 401))

    const userData = {userName, email, phoneNumber,_id:customer.userId}
    if(password) userData.password = await bcrypt.hash(password, 8);

    let {newUser,newCustomer,appError} = await transUpdateCustomer( userData);
    if (appError) {
        return next(appError);
    }
    return res.json({message:"Customer updated successfully",newCustomer,newUser});
}


export const deleteCustomer = async (req, res, next) => {
    const { customerId } = req.params
    const id = req.authUser.id
    if(customerId !==id) return next( new AppError("User is not authorized for this action", 401));
    let {deletedUser,deletedCustomer,appError} = await transDeleteCustomer(id)
    if (appError) {
        return next(appError);
    }
    return res.status(200).json({message:"Successfully deleted", deletedCustomer,deletedUser});

}


