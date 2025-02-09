import {AppError} from "../../utils/AppError.js";


export const verifyRole = ()=>{
        return async (req, res, next) => {
            const {role} = req.authUser;
            const {id} = req.user;
            const userId = req.params.id;
            if (role != 'Client' && id != userId) {
                return next(new AppError("You don't have permission to perform this action", 401));
            }
            next();
        }

}


