import Joi from "joi";


export const createLocalCustomerSchema = Joi.object({
        userName: Joi.string()
            .min(3)
            .required()
            .messages({
                'string.base': 'User name must be a string.',
                'string.empty': 'User name cannot be empty.',
                'string.min': 'User name must be at least 3 characters long.',
                'any.required': 'User name is required.',
            }),
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.base': 'Email must be a string.',
                'string.empty': 'Email cannot be empty.',
                'string.email': 'Please provide a valid email address.',
                'any.required': 'Email is required.',
            }),
        password: Joi.string()
            .min(6)
            .required()
            .messages({
                'string.base': 'Password must be a string.',
                'string.empty': 'Password cannot be empty.',
                'string.min': 'Password must be at least 6 characters long.',
                'any.required': 'Password is required.',
            }),
        phoneNumber: Joi.string()
            .pattern(/^[0-9]{10}$/)
            .required()
            .messages({
                'string.base': 'Phone number must be a string.',
                'string.empty': 'Phone number cannot be empty.',
                'string.pattern.base': 'Please provide a valid 10-digit phone number.',
                'any.required': 'Phone number is required.',
            }),
    });


export const createCustomerSchema = Joi.object({
    userName: Joi.string().min(3).max(30).required().messages({
        "string.empty": "User name is required.",
        "string.min": "User name must be at least 3 characters long.",
        "string.max": "User name must not exceed 30 characters.",
    }),

    email: Joi.string().email().messages({
        "string.email": "Please enter a valid email address.",
    }),

    phoneNumber: Joi.string()
        .pattern(/^[0-9]{10,15}$/)
        .messages({
            "string.pattern.base": "Phone number must be between 10 to 15 digits.",
        }),
})
    .or("email", "phoneNumber")
    .messages({
        "object.missing": "At least one of email or phone number is required.",
    });

