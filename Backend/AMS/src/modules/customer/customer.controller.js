import bcrypt from "bcrypt";
import {userModel} from "../../../DB/model/relations.js";
import {AppError} from "../../utils/AppError.js";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
import _ from "lodash";
dotenv.config();

export const  createCustomer = async (req, res,next) => {
    if(req.user){
        return next(new AppError("User already exists!"),409);
    }
    const{ userName, email, password,phoneNumber } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);
    const user = await userModel.create({userName,email,password:hashedPassword,phoneNumber})
    return res.status(201).json({message:"Successfully created",user})
}

export const getAllCustomers = async (req, res,next) => {
    let customers = []
    customers = await userModel.findAll({where:{role:'Customer'}})
    return res.status(200).json({message:"success",customers})

}

export const customerLogin = async (req, res, next) => {
    const user = req.user;
    const {password}=req.body;
    if(!user){
        return next(new AppError("User does not exist!"),401);
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if(!validPassword){
        return next(new AppError("Invalid Password",401))
    }
    const token = jwt.sign(
        {name:user.name,email:user.email,phoneNumber:user.phoneNumber,role:user.role},
    process.env.JWT_SECRET)
    return res.status(200).json({message:"Successfully logged in",token:token})
}

export const deleteCustomer = async (req, res,next) => {
    const user =req.user
    if(!user){
        return next(new AppError("User does not exist!"),401);
    }
    await user.destroy()
    return res.status(200).json({message:"Successfully deleted",user})
}

export const updateCustomer = async (req, res,next) => {
    const user = req.user;
    const allowedUserFields = ["userName", "phoneNumber", "password","email"];
    let userData = _.pickBy(_.pick(req.body, allowedUserFields), _.identity);
    if (userData?.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
    }
    if (_.isEmpty(userData)) {
        return next(new AppError("No valid fields provided for update.",404))
    }
    await user.update(userData);
    return res.status(200).json({
        message: "Customer updated successfully",
        data: { ...userData }
    });
}

