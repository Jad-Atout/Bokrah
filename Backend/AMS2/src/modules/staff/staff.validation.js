import Joi from "joi";

export const createStaffValidationSchema = Joi.object({
    userName: Joi.string().min(3).max(50).required().messages({
        "string.base": "Name should be a string.",
        "string.min": "Name should have at least 3 characters.",
        "string.max": "Name should not exceed 50 characters.",
        "any.required": "Name is required."
    }),

    email: Joi.string().email().required().messages({
        "string.base": "Email should be a string.",
        "string.email": "Please provide a valid email address.",
        "any.required": "Email is required."
    }),

    phoneNumber: Joi.string().pattern(/^\+?[0-9]{10,15}$/).required().messages({
        "string.base": "Phone number should be a string.",
        "string.pattern.base": "Phone number should be a valid phone number (10-15 digits).",
        "any.required": "Phone number is required."
    }),

    roleDescription: Joi.string().min(10).max(200).required().messages({
        "string.base": "Role description should be a string.",
        "string.min": "Role description should have at least 10 characters.",
        "string.max": "Role description should not exceed 200 characters.",
        "any.required": "Role description is required."
    }),

});
