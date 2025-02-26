import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {AppError} from "../utils/AppError.js";
import userModel from "../../DB/models/user.js";
import dotenv from "dotenv";

dotenv.config()
export const setPasswordAndConfirm = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        const decoded = jwt.verify(token, process.env.JWT_CONFIRME_SECRET);

        const user = await userModel.findById(decoded.id);
        if (!user) return next(new AppError("Invalid token", 400));


        user.password = await bcrypt.hash(password, parseInt(process.env.SALT_ROUND));
        user.confirmed = true;
        user.authProvider = 'local'
        await user.save();
        return res.json({ message: "Password set successfully. Email confirmed. You can now log in!" });
    } catch (error) {
        return next(new AppError(error, 400));
    }
};
