import joi from "joi";

export const adminLoginSchema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
})
export const registerSchema = joi.object({
    userName: joi.string().min(3).required(),
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
})