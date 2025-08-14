import {AppError} from "../utils/AppError.js";
import {decode} from "jsonwebtoken";

//TODO Implement the rest of access token logic
export const handelRefreshToken = (req,res,next) =>{
    const cookies = req.cookies
    if(!cookies?.jwt) return next(new AppError("No valid jwt cookie"),401);
    const refreshToken = cookies.jwt
    const user = null // fetching User data
    if(!user) return next(new AppError("User not found"),403)
    // evaluate jwt
    jwt.verify(
        refreshToken,
        process.env.ACCESS_TOKEN_SECRET,
        (err,decode)=>{
            if(err /* || user does not match  */) return next(new AppError("Forbidden from refreshing",403))
             const accessToken = null   //jwt.sign(
            //     { "username": decoded.username },
            //     process.env.ACCESS_TOKEN_SECRET,
            //     { expiresIn: '30s' }
            //);
           return  res.json({ accessToken })



        }
    )

}