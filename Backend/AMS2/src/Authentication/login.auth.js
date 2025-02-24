import userModel from "../../DB/models/user.js";
import {AppError} from "../utils/AppError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import roleModel from "../../DB/models/role.js";
import clientModel from "../../DB/models/client.js";
import customerModel from "../../DB/models/customer.js";
import staffModel from "../../DB/models/staff.js";
import {sendEmail} from "../utils/email.js";

export const generalLogin = async (req, res,next) => {
    const { email, password,phoneNumber } = req.body;
    const filter = {}
    if(email) filter.email = email;
    if(phoneNumber) filter.phoneNumber = phoneNumber;
    const user = await userModel.findOne(filter);
    console.log(user.confirmed)
    if (!user) {
        return next(new AppError("User doesn't exist"),401);
    }else if(!user.confirmed){
        return next(new AppError("User isn't confirmed"),404);
    }else if(user.authProvider!=="local"){
        return next(new AppError("User have to change password",403));
    }
    const checkPassword = await bcrypt.compare(password,user.password)
    if(!checkPassword){
        return next(new AppError("Wrong Password",403));
    }
    const role = await roleModel.findById(user.roleId)
    console.log(role)
    let tokenData = {
        id: user.id,
        userName: user.userName,
        email: user.email,
        role: role,
    }
    if(role.client){
        const client = await clientModel.findOne({userId: user._id});
        tokenData.buisnessName = client.businessName
        tokenData.industry = client.industry
        tokenData.clientId = client._id

    }else if(role.customer){
        const customer = await customerModel.findOne({userId: user._id})
        tokenData.customerId = customer._id
    }else if(role.staff){
        const staff = await staffModel.findOne({userId:user._id})
        tokenData.roleDescription=staff.roleDescription
        tokenData.availability=staff.availability

    }
    const token = jwt.sign(tokenData,process.env.JWT_SECRET)


    return res.status(200).json({message:"Login Successfully",token,tokenData})

}


export const confirmEmail = async (req, res, next) => {
    try {
        const { token } = req.params;

        if (!token) {
            return next(new AppError("Invalid or missing token", 400));
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return next(new AppError("Invalid or expired token", 401));
        }

        const user = await userModel.findById(decoded.id);

        if (!user) {
            return next(new AppError("User not found", 404));
        }

        if (user.confirmed) {
            return res.status(200).json({ message: "Email already confirmed" });
        }

        user.confirmed = true;
        await user.save();

        return res.status(200).json({ message: "Email confirmed successfully" });
    } catch (error) {
        return next(new AppError("Something went wrong", 500));
    }
};