import Joi from "joi";

export const generalLoginSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } }) // Validates email format
        .messages({
            "string.email": "Invalid email format.",
            "string.empty": "Email cannot be empty."
        }),

    password: Joi.string()
        .min(6) // Minimum length of 8 characters
        .max(32) // Maximum length of 32 characters
        .pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
        .messages({
            "string.empty": "Password is required.",
            "string.min": "Password must be at least 8 characters long.",
            "string.max": "Password must not exceed 32 characters.",
            "string.pattern.base": "Password must contain at least one uppercase letter, one number, and one special character."
        }),

    phoneNumber: Joi.string()
        .pattern(/^\d{10,15}$/) // Validates phone numbers with 10-15 digits
        .messages({
            "string.pattern.base": "Phone number must be between 10 and 15 digits.",
            "string.empty": "Phone number cannot be empty."
        })
})
    .or("email", "password") // Ensures at least one of email or password is required
    .messages({
        "object.missing": "At least one of 'email' or 'password' is required."
    });