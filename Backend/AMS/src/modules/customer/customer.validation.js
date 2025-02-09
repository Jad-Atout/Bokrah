import joi from 'joi'
export const registerSchema = joi.object({
    userName: joi.string().min(3).required(),
    email: joi.string().email(),
    phoneNumber: joi.string().pattern(/^[0-9]{10,15}$/), // Allows 10-15 digit phone numbers
    password: joi.string().min(6).required(),
}).or("email", "phone");


export const loginSchema = joi.object({
    phoneNumber: joi.string().pattern(/^[0-9]{10,15}$/), // Allows 10-15 digit phone numbers
    email: joi.string().email(),
    password: joi.string().required().min(6),
}).or("email", "phone");
export const customerDeleteSchema = joi.object({
    id:joi.number().min(1).required()
})
export const customerUpdateSchema = joi.object({
    id:joi.number().min(1).required(),
    userName: joi.string().min(3),
    email: joi.string().email().pattern(/^[a-zA-Z0-9._%+-]+@gmail\.com$/).messages({"string.pattern.base": "Only Gmail addresses are allowed"}),
    phoneNumber: joi.string().pattern(/^[0-9]{10,15}$/),
    password: joi.string().min(6),
})