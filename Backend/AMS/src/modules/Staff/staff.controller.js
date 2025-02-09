import {AppError} from "../../utils/AppError.js";
import bcrypt from "bcrypt";
import userModel from "../../../DB/model/user.js";
import staffModel from "../../../DB/model/staff.js";


export const createStaff = async (req, res,next) => {
    const authUser = req.authUser;
    if(req.user){
        return next(new AppError('Staff already exists'),409);
    }
    const { userName, email, password,phoneNumber } = req.body;
    const roleDescription = req.body.roleDescription;
    const availability = req.body.availability;
    const hashedPassword = await bcrypt.hash(password, 8);
    const user = await userModel.create({userName, email, password:hashedPassword,phoneNumber,role:'Staff'})
    const staffData = {id:user.id,clientId:authUser.id}
    if (roleDescription) staffData.roleDescription = roleDescription
    if (availability) staffData.availability = availability
    const staff = await staffModel.create(staffData)
    return res.status(201).json({message:"Successfully created",staff,userName:user.userName})

}