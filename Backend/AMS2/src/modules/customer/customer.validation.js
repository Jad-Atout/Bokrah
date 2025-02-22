import Joi from "joi";

export const createLocalCustomerSchema = (data) => {
    const schema = Joi.object({
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
            .min(8)
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

    return schema.validate(data);
};