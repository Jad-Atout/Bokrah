import bcrypt from "bcrypt";
import userModel from "../../DB/models/user.js";
import { AppError } from "../utils/AppError.js";

export const changePassword = async (req, res, next) => {
    try {
        let { email, currentPassword, newPassword } = req.body;
        email= email.toLowerCase()
        const user = await userModel.findOne({ email });

        if (!user) {
            return next(new AppError("Email not found", 404));
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return next(new AppError("Current password is incorrect", 400));
        }

        user.password = await bcrypt.hash(newPassword, parseInt(process.env.SALT_ROUND));
        user.sendCode = null;
        user.confirmed = true;
        user.authProvider = 'local';

        await user.save();

        return res.status(200).json({ message: "Password changed successfully. You can now log in!" });

    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};
