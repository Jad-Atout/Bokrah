import {AppError} from "../../utils/AppError.js";
import staffModel from "../../../DB/models/staff.js"
import {transCreateStaff, transDeleteStaff, transUpdateStaff} from "../../../DB/Controller/staff.DB.controller.js";




export const createStaff = async (req, res, next) => {
    const {userName, email, phoneNumber, roleDescription} = req.body;
    const {clientId} = req.authUser;
    const staff = await transCreateStaff(
        {userName, email, phoneNumber, authProvider: "actor"},
        {clientId, roleDescription},
    )
    if (staff instanceof AppError) {
        return next(staff)
    }
    return res.json({message: "Staff successfully created", staff});
}



export const getClientStaff = async (req, res) => {
    //TODO format the return statement
    //TODO validate ID
    const { clientId } = req.params
    const staffs = await staffModel.find({clientId: clientId})
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