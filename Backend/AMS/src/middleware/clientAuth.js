import {AppError} from "../utils/AppError.js";

/**
 * Middleware to authorize "Client" role users.
 *
 * @returns {Function} The middleware function.
 */
const clientAuth = ()=> {
    return async (req, res, next) => {
        const role = req.authUser.role;
        if(role==='Client'){
            return next();
        }else {
            return next(new AppError("Not Authorized"),401);
        }
    }
}
export default clientAuth;