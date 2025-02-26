import {AppError} from "../../utils/AppError.js";
import staffModel from "../../../DB/models/staff.js"
import {transCreateStaff, transDeleteStaff, transUpdateStaff} from "../../../DB/Controller/staff.DB.controller.js";
import jwt from "jsonwebtoken";
import {sendEmail} from "../../utils/email.js";
import {setPasswordEmailTemplate} from "../../utils/emailTemplete.js"


export const createStaff = async (req, res, next) => {
    const {userName, email, phoneNumber, roleDescription} = req.body;
    const {clientId} = req.authUser;
    const oauth2Client= req.oauth2Client
    const {staff,user,appError} = await transCreateStaff(
        {userName, email, phoneNumber, authProvider: "actor"},
        {clientId, roleDescription},
        oauth2Client
    )
    if (appError) {
        return next(appError)
    }
    const tokenData ={id:user._id,email:user.email}
    const token = jwt.sign(tokenData, process.env.JWT_CONFIRME_SECRET);
    await sendEmail(user.email,  "Set Your Password & Confirm Your Email",
         await setPasswordEmailTemplate( user.userName, token)
);
    return res.json({message: "Staff successfully created", staff});
}



export const getClientStaff = async (req, res) => {
    const { clientId } = req.params
    const staffs = await staffModel.find({clientId: clientId}).populate([
        {
            path:"userId",
            ref:"user",
            select:"userName email phoneNumber ",
        },
        {
            path: "clientId",
            ref: "client",
            populate:{
                path:"userId",
                ref:"user",
                select:"userName email phoneNumber"
            }
        },
        {
            path:"services",
            ref:"service",
            select: "serviceName"
        },{
        path:"availability",
            ref: "Availability",
        }
    ])
    return res.json({message:"success",staffs},200)
}

export const deleteStaff = async (req, res, next) => {
        const { staffId } = req.params;
        const result = await transDeleteStaff(staffId);
        if (result instanceof AppError) {
            return next(result);
        }
        return res.json(result);

};



export const updateStaff = async (req, res, next) => {
        const { staffId } = req.params;
        const { userName, email, phoneNumber, roleDescription } = req.body;
        const result = await transUpdateStaff(staffId, { userName, email, phoneNumber }, { roleDescription });
        if (result instanceof AppError) {
            return next(result);
        }
        return res.json(result);
};