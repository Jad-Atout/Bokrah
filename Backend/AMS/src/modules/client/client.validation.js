import joi from "joi";

export const clientRegisterSchema= joi.object({
    userName: joi.string().min(3).required(),
    email: joi.string().email().pattern(/^[a-zA-Z0-9._%+-]+@gmail\.com$/).required().messages({"string.pattern.base":"Only Gmail addresses are allowed"}),
    phoneNumber: joi.string().pattern(/^[0-9]{10,15}$/).required(),
    password: joi.string().min(6).required(),
    businessName:joi.string().min(3).required(),
})
export const clientLoginSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
})
export const deleteClientSchema = joi.object({
    id:joi.number().min(1).required()
})
export const updateClientSchema= joi.object({
    id:joi.number().min(1).required(),
    userName: joi.string().min(3),
    email: joi.string().email().pattern(/^[a-zA-Z0-9._%+-]+@gmail\.com$/).messages({"string.pattern.base": "Only Gmail addresses are allowed"}),
    phoneNumber: joi.string().pattern(/^[0-9]{10,15}$/),
    password: joi.string().min(6),
    businessName: joi.string().min(3),
})