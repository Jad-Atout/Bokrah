import joi from "joi";
export const createStaffSchema = joi.object({
    userName: joi.string().min(3).required(),
    clientId:joi.number().required(),
    email: joi.string().email().required(),
    phoneNumber: joi.string().pattern(/^[0-9]{10,15}$/).required(),
    password: joi.string().min(6).required(),
    availability:joi.string(),
    roleDescription: joi.string(),
})