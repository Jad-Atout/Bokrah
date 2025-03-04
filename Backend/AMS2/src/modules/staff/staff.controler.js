import staffModel from "../../../DB/models/staff.js"
import {
    populateStaff,
    transCreateStaff,
    transDeleteStaff,
    transUpdateStaff
} from "../../../DB/Controller/staff.DB.controller.js";
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
    return res.json({message: "Staff successfully created", staffs:filterStaffData([staff])});
}


function filterStaffData(data) {
    console.log(data)
    return data.map(staff => ({
            staff: {
                userName: staff.userId.userName,
                email: staff.userId.email,
                phoneNumber: staff.userId.phoneNumber,
                roleDescription: staff.roleDescription,
                availabilityId: staff.availability,
                staffId:staff._id
            },
            client: {
                userName: staff.clientId.userId.userName,
                email: staff.clientId.userId.email,
                industry: staff.clientId.industry,
                businessName: staff.clientId.businessName,
                clientId: staff.clientId.clientId,
            },
            services: staff.services.map(service => ({
                serviceId: service._id,
                serviceName: service.serviceName
            })),

        }))

}




export const getClientStaff = async (req, res) => {
    const { clientId } = req.params
    const staffs = await staffModel.find({clientId: clientId}).populate(populateStaff)
    return res.json({message:"success",staffs:filterStaffData(staffs)},200)
}

export const deleteStaff = async (req, res, next) => {
        const staffObject  = req.staff;
        const {appError,staff,appointmentIds} = await transDeleteStaff(staffObject,req.oauth2Client);
        if (appError) {
            return next(appError);
        }else if (staff){
            let data = [staff];
            return res.status(200).json({message:"Successfully deleted", staffs:filterStaffData(data)});
        }
        return next({appError,appointmentIds});

};



export const updateStaff = async (req, res, next) => {
        const staffObject  = req.staff;
        const { userName, email, phoneNumber, roleDescription } = req.body;
        const {appError,staff} = await transUpdateStaff(staffObject, { userName, email, phoneNumber }, { roleDescription });
        if (appError) {
            return next(appError);
        }
        let data = [staff]
        return res.json({message:"Successfully updated", staffs:filterStaffData(data)});

};