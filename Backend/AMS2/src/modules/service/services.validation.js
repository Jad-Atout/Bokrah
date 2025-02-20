import Joi from 'joi';

export const createServiceSchema = Joi.object({
    serviceName: Joi.string()
        .min(3)
        .max(50)
        .required()
        .messages({
            'string.base': 'Service name must be a string.',
            'string.empty': 'Service name cannot be empty.',
            'string.min': 'Service name must be at least 3 characters long.',
            'string.max': 'Service name must be no more than 50 characters long.',
            'any.required': 'Service name is required.',
        }),
    serviceDescription: Joi.string()
        .min(10)
        .max(500)
        .required()
        .messages({
            'string.base': 'Service description must be a string.',
            'string.empty': 'Service description cannot be empty.',
            'string.min': 'Service description must be at least 10 characters long.',
            'string.max': 'Service description must be no more than 500 characters long.',
            'any.required': 'Service description is required.',
        }),

    price: Joi.number()
        .positive()
        .precision(2)
        .messages({
            'number.base': 'Price must be a number.',
            'number.positive': 'Price must be a positive number.',
            'number.precision': 'Price must have up to 2 decimal places.',
        }),

    duration: Joi.number()
        .integer()
        .min(1)
        .max(720)
        .required()
        .messages({
            'number.base': 'Duration must be a number.',
            'number.integer': 'Duration must be an integer.',
            'number.min': 'Duration must be at least 1 minute.',
            'number.max': 'Duration must be no more than 12 hours (720 minutes).',
            'any.required': 'Duration is required.',
        }),
});