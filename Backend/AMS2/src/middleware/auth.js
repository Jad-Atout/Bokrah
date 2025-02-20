
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AppError } from "../utils/AppError.js";
import userModel from "../../DB/models/user.js";

dotenv.config();

export const roles = {
    Admin: 'admin',
    Staff: 'staff',
    Customer:'customer',
    Client:'client'
}

export const auth = (requiredRole = null) => {
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

            // If a requiredRole is specified, check the user's role dynamically
            if (requiredRole && (!decoded.role || !decoded.role[requiredRole])) {
                return next(new AppError(`Unauthorized: Only ${requiredRole}s can access this resource`, 403));
            }
            next();
        } catch (err) {
            console.error("Auth Middleware Error:", err);
            return next(new AppError("Authentication failed", 500));
        }
    };
};

