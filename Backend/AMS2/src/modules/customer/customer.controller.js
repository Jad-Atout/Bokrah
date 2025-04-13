import {AppError} from "../../utils/AppError.js";
import bcrypt from "bcrypt";
import  userModel from "../../../DB/models/user.js";
import clientCustomerModel from "../../../DB/models/ClientCustomer.js";
import customerModel from "../../../DB/models/customer.js";
import dotenv from "dotenv";
import {
    transCreateCustomer,
    transDeleteCustomer,
    transUpdateCustomer
} from "../../../DB/Controller/customer.DB.controller.js";
import {sendEmail} from "../../utils/email.js";
import {setPasswordEmailTemplate, welcomeEmailTemplate} from "../../utils/emailTemplete.js";
import jwt from "jsonwebtoken";
import appointment from "../../../DB/models/appointment.js";
import prepareToken from "../../utils/Google/Services/refreshToken.js";
import {cancelAppointment} from "../appointment/controller/cancelAppointment.controller.js";
dotenv.config()

// login directry after confirmation



export const createCustomer = async (req, res, next) => {
    const { userName, email, phoneNumber } = req.body;
    const filter = {}
    if(email) filter.email = email;
    if(phoneNumber) filter.phoneNumber = phoneNumber;
    let user = await userModel.findOne(filter)
    let customer = await customerModel.find({userId:user?._id})
    if(user){
        if(customer) return res.status(400).json({ message: "User already exists", user,customer });
    }

    let { user: newUser, customer: newCustomer, appError } = await transCreateCustomer({userName, email, phoneNumber,userId:(user)?user._id:null,authProvider: "actor"})
    console.log(newUser,newCustomer,appError)
    if(appError) return next(appError);

    const clientId = req.authUser.clientId;

    const existingAssignment = await clientCustomerModel.findOne({  customerId: newCustomer._id, clientId });
    if (!existingAssignment) {
        const assign = new clientCustomerModel({ customerId: newCustomer._id, clientId });
        await assign.save();
    }

    const tokenData={id:newUser._id, email:newUser.email,}
    const token = jwt.sign(tokenData, process.env.JWT_CONFIRME_SECRET);
    await sendEmail(newUser.email,  "Welcome",
        await welcomeEmailTemplate( newUser.userName, token)
    );
    await sendEmail(newUser.email,  "Set Your Password & Confirm Your Email",
        await setPasswordEmailTemplate( newUser.userName, token))
    return res.status(201).json({ message: "Successfully created", newUser,newCustomer});
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
    let {user:newUser,customer,appError} = await transCreateCustomer({userName, email, phoneNumber, password:hashedPassword,authProvider: "local"})
    if(appError) return next(appError);

    const tokenData={id:newUser._id, email:newUser.email,}
    const token = jwt.sign(tokenData, process.env.JWT_CONFIRME_SECRET);

    await sendEmail(newUser.email,  "Welcome",
        await welcomeEmailTemplate( newUser.userName, token)
    );
    return res.status(201).json({ message: "Successfully created", newUser,customer });
};

export const getClientCustomers = async (req, res, next) => {
    try {
        const { clientId } = req.authUser;

        const clientCustomers = await clientCustomerModel.find({ clientId });

        const customerIds = clientCustomers.map((cc) => cc.customerId);

        const customers = await customerModel.find({ _id: { $in: customerIds } })
            .populate({
                path: "userId",
                select: "userName email phoneNumber",
            });

        const customersWithStatus = customers.map((customer) => {
            const relationship = clientCustomers.find(cc => cc.customerId.toString() === customer._id.toString());
            return {
                ...customer.toObject(),
                isActive: relationship ? relationship.isActive : false, // Default to false if no relationship exists
            };
        });

        return res.status(200).json({
            message: "success",
            customers: customersWithStatus,
        });

    } catch (error) {
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

    let {user:newUser,customer:newCustomer,appError} = await transUpdateCustomer( userData);
    if (appError) {
        return next(appError);
    }
    return res.json({message:"Customer updated successfully",newCustomer,newUser});
}


export const deleteCustomer = async (req, res, next) => {
    const { customerId } = req.params
    const id = req.authUser.customerId
    console.log(id,customerId)
    if(customerId !==id) return next( new AppError("User is not authorized for this action", 401));
    let {user:deletedUser,customer:deletedCustomer,appError} = await transDeleteCustomer(id)
    console.log(deletedCustomer,deletedUser);
    if (appError) {
        return next(appError);
    }
    return res.status(200).json({message:"Successfully deleted", deletedCustomer,deletedUser});

}

export const toggleBlockCustomer = async (req, res, next) => {
    const { customerId } = req.params
    const {clientId} = req.authUser
    const relation =  await clientCustomerModel.findOne({clientId,customerId})
    if(!relation) return next(new AppError("Relation does not exists", 401));
    relation.isActive = !relation.isActive
    if(!relation.isActive){
        const appointments = await appointment.find({customerId:customerId})
        for (appoint of appointments) {
            await cancelBlockedCustomerAppointments(appoint._id,clientId)
        }
    }
    await relation.save()
    return res.status(200).json({message:"success"})
}
const cancelBlockedCustomerAppointments = async (appointmentId, clientId) => {
    let auth;
    const req = {
        authUser: { clientId },
        params: {},
        body: { appointmentId }
    };

    const res = {
        status: () => res,
        json: (data) => console.log("Response JSON:", data)
    };

    const next = (err) => {
        if (err) console.error("Error:", err);
        auth = req.oauth2Client;
    };

    const middleware1 = prepareToken();
    await middleware1(req, res, next);

    const middleware2 = cancelAppointment();
    await middleware2(req, res, next);
};


export const getCustomersCount = async (req, res, next) => {
    try {
        const customerCount = await customerModel.countDocuments();
        return res.status(200).json({ message: "Success", count: customerCount });
    } catch (error) {
        console.error("Error fetching customer count:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};
