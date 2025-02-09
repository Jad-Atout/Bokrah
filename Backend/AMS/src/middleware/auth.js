import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import {AppError} from "../utils/AppError.js";
import {userModel} from "../../DB/model/relations.js";
dotenv.config()

const auth = ()=> {
    return async (req, res, next) => {
        try {
            const {token} = req.headers
            if (!token) {
                return next(new AppError("No Token provided"),400);
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            if (!decoded) {
                return next(new AppError('Unauthorized',401))
            }
            const checkAuthUser = await userModel.findByPk(decoded.id)
            if (!checkAuthUser) {
                return next(new AppError('Unauthorized',401))
            }
            req.authUser = decoded
            return next()
        } catch (err) {
            return next(new AppError('Internal Server Error at auth.js'))

        }
    }
}
export default auth;