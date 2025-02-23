
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AppError } from "../utils/AppError.js";
import userModel from "../../DB/models/user.js";
import { customAlphabet } from "nanoid";
import user from "../../DB/models/user.js";

dotenv.config();

export const roles = {
    Admin: 'admin',
    Staff: 'staff',
    Customer:'customer',
    Client:'client'
}

export const auth = (...requiredRole) => {
    return async (req, res, next) => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith(process.env.BEARERTOKEN)) {
                return next(new AppError("No token provided", 400));
            }
            const token = authHeader.split("__")[1];
            if (!token) {
                return next(new AppError("Invalid token format", 400));
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (!decoded) {
                return next(new AppError("Invalid token", 401));
            }
            const checkUserExistence = await userModel.findById(decoded.id)
            if(!checkUserExistence) {
                return next(new AppError("User does not exist", 401));
            }
            req.authUser = decoded;
            const userRoles =decoded.role
            const hasRole = requiredRole.some(role=>userRoles[role]===true)
            if(!hasRole){
                return next(new AppError("User is not authorized", 401));
            }
            next();
        } catch (err) {
            console.error("Auth Middleware Error:", err);
            return next(new AppError("Authentication failed", 500));
        }
    };
};

export const sendCode = async(req,res) => {
    const {email} = req.body;

    const code = customAlphabet('1234567890abcdef', 6)();
    const user = await userModel.findOneAndUpdate({email},{sendCode:code}, {new:true});

    if (!user){
        return res.status(404).json({message:"Email not found"});
    }

    await sendEmail(email, 'Password Reset Code', sendCodeTemplate,  {userName:user.userName, code});

    return res.status(200).json({message:"success"});

}