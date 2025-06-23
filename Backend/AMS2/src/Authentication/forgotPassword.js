import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import userModel from "../../DB/models/user.js";
import {sendCodeTemplate} from "../utils/emailTemplete.js";
import {customAlphabet} from "nanoid"
import {sendEmail} from "../utils/email.js";
import {AppError} from "../utils/AppError.js";

export const forgotPassword = async (req, res, next) => {
    try {
        let { email, password, code } = req.body;
        email = email.toLowerCase();
        const user = await userModel.findOne({ email });

        if (!user) {
            return next(new AppError("Email not found", 404));
        }


        if (user.sendCode !== code) {
            return next(new AppError("Invalid code", 400));
        }

        user.password = await bcrypt.hash(password, parseInt(process.env.SALT_ROUND));
        user.sendCode=null;
        user.confirmed = true;
        user.authProvider = 'local';

        await user.save();

        return res.status(200).json({ message: "Password reset successfully. You can now log in!" });

    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};

export const sendCode = async (req, res, next) => {
    try {
        let { email } = req.body;
        email = email.toLowerCase();
        const generateCode = customAlphabet('1234567890', 6);
        const code = generateCode();

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "Email not found" });
        }

        user.sendCode=code;
        await user.save();


        await sendEmail(email, 'Password Reset Code',await sendCodeTemplate(email, user.userName, code));

        return res.status(200).json({ message: "Verification code sent successfully!" });
    } catch (error) {
        return next(error);
    }
};
