import {userModel} from "../../../DB/model/relations.js";
import {AppError} from "../../utils/AppError.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const adminLogin= async (req,res,next)=>{
    const user = req.user;
    if(!user){
        return next(new AppError("User not found"));
    }
    const{password} = req.body;
    if(user.role!='Admin'){
        return next(new AppError("User is not an Admin",401))
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if(!validPassword){
        return next(new AppError("Invalid Password",401))
    }
    const token = jwt.sign({userName:user.userName,email:user.email,role:user.role},process.env.JWT_SECRET)
    return res.status(200).json({message:"Login Successfully",token:token})
}

export const adminRegister= async (req,res,next)=>{
    const user_ = req.user;
    if(user_){
        return next(new AppError("User already exists",401));
    }
    const{ userName, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);
    const user = await userModel.create({userName: userName,email,password:hashedPassword,role:"Admin"})
    return res.status(201).json({message:"Successfully created",user})
}