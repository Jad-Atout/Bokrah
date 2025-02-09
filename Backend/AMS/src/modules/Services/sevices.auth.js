import {AppError} from "../../utils/AppError.js";

export const verifyRole = ()=>{
    return async (req, res, next) => {
        const {role} = req.authUser;
        if (role != 'Client') {
            return next(new AppError("You don't have permission to perform this action", 401));
        }
        next();
    }

}