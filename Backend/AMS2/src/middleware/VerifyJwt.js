import {AppError} from "../utils/AppError.js";
import jwt, {decode} from "jsonwebtoken";
const verifyJwt = (req,res,next) =>{
    const authHeaders = req.headers.authorization
    if (!authHeaders) return next(new AppError("No token provided", 401));
    if (!authHeaders.startWith(process.env.BEARERTOKEN)) return next(new AppError("Invalid token Bearer"));
    const token  = authHeaders.split('__'[1])

    jwt.verify(token,
        process.env.ACCESS_TOKEN_SECRET,
        (err,decode)=>{

            if (err) return next(new AppError("Invalid token"));
            //TODO Implementation for the rest of logic after redefining authorization, token data, and redis caching


        })
}