import userModel from "../../DB/models/user.js";
import {AppError} from "../utils/AppError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import roleModel from "../../DB/models/role.js";
import clientModel from "../../DB/models/client.js";
import customerModel from "../../DB/models/customer.js";
import staffModel from "../../DB/models/staff.js";
import websiteModel from "../../DB/models/website.js";
import { config } from "dotenv";

config();

export const generalLogin = async (req, res,next) => {
    const { email, password,phoneNumber } = req.body;
    const filter = {}
    if(email) filter.email = email;
    if(phoneNumber) filter.phoneNumber = phoneNumber;
    const user = await userModel.findOne(filter);
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
    let tokenData = {
        id: user.id,
        userName: user.userName,
        email: user.email,
        phoneNumber:user.phoneNumber,
        role: role,
    }
    if(role.client){
        const client = await clientModel.findOne({userId: user._id});
        const website = await websiteModel.findOne({ clientId: client._id });
        if (!website) {
            return next(new AppError("Website information not found", 404));
        }
        tokenData.buisnessName = website.businessName
        tokenData.industry = website.industry
        tokenData.clientId = client._id
    }
    if(role.customer){
        const customer = await customerModel.findOne({userId: user._id})
        tokenData.customerId = customer._id
    }
    if(role.staff){
        const staff = await staffModel.findOne({userId:user._id})
        tokenData.roleDescription=staff.roleDescription
        tokenData.availability=staff.availability
        tokenData.staffId = staff._id
    }
    const token = jwt.sign(tokenData,process.env.JWT_SECRET)


    return res.status(200).json({message:"Login Successfully",token,tokenData})

}


