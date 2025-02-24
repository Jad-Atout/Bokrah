import {AppError} from "../utils/AppError.js";
import jwt from "jsonwebtoken";
import userModel from "../../DB/models/user.js";

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