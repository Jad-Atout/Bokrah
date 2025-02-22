import userModel from "../../DB/models/user.js";
import {AppError} from "../utils/AppError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import roleModel from "../../DB/models/role.js";
import clientModel from "../../DB/models/client.js";
import customerModel from "../../DB/models/customer.js";
import staffModel from "../../DB/models/staff.js";

export const generalLogin = async (req, res,next) => {
    const { email, password,phoneNumber } = req.body;
    const user = await userModel.find({email,phoneNumber});
    if (!user) {
        return next(new AppError("User doesn't exist"),401);
    }else if(user.length>1){
        return next(new AppError("Wrong User Data"),403);
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
        role: role.toObject(),
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

    }
    const token = jwt.sign({

        businessName: client.businessName,
        role: user_.role
    },process.env.JWT_SECRET)

}