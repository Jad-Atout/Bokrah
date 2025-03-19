import staffModel from "../../../DB/models/staff.js";
import {AppError} from "../../utils/AppError.js";

export const verifyOwnership =  ()=>{
    return async (req,res,next)=>{
        const {clientId} = req.authUser
        const {staffId} = req.params
        const staff = await staffModel.findById(staffId)
        if(!staff){
            return next(new AppError("Staff isn't found."))
        }
        if(staff.clientId?.toString() === clientId?.toString()){
            req.staff = staff
            return next()

        }
        return next(new AppError('Not authorized'))

    }
}