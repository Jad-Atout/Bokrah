import { AppError } from "../../utils/AppError.js";
import userModel from "../../../DB/model/user.js";

// Middleware to verify if the user is an Admin or the Client they are trying to update
export const verifyRole = () => {
    return async (req, res, next) => {
        const {role, id} = req.authUser;
        const userId = req.params.id;
        if (role != 'Admin' && id != userId) {
            return next(new AppError("You don't have permission to perform this action", 401));
        }
        req.user = await userModel.findByPk(userId);
        next();
    }

};
