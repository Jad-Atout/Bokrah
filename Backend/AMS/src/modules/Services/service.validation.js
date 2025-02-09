import joi from 'joi';

export const creatServiceSchema = joi.object({
    serviceName: joi.string().min(3).max(100).required()
        .messages({
            'string.base': 'Service name must be a string.',
            'string.min': 'Service name must be at least 3 characters long.',
            'string.max': 'Service name must not exceed 100 characters.',
            'any.required': 'Service name is required.'
        }),

    serviceDescription: joi.string().min(10).max(500)
        .messages({
            'string.base': 'Service description must be a string.',
            'string.min': 'Service description must be at least 10 characters long.',
            'string.max': 'Service description must not exceed 500 characters.',
        }),

    price: joi.number().min(0).precision(2).default(0)
        .messages({
            'number.base': 'Price must be a valid number.',
            'number.min': 'Price cannot be negative.',
            'number.precision': 'Price can have up to 2 decimal places.'
        }),

    duration: joi.number().integer().min(10).default(30)
        .messages({
            'number.base': 'Duration must be a valid number.',
            'number.integer': 'Duration must be an integer.',
            'number.min': 'Duration must be at least 10 minutes.',
        })
});

export const updateServiceSchema = joi.object({
    id: joi.number().integer().positive().required()
        .messages({
            'number.base': 'ID must be a number.',
            'number.integer': 'ID must be an integer.',
            'number.positive': 'ID must be a positive number.',
            'any.required': 'ID is required.'
        }),
    serviceName: joi.string().min(3).max(100)
        .messages({
            'string.base': 'Service name must be a string.',
            'string.min': 'Service name must be at least 3 characters long.',
            'string.max': 'Service name must not exceed 100 characters.'
        }),

    serviceDescription: joi.string().min(10).max(500)
        .messages({
            'string.base': 'Service description must be a string.',
            'string.min': 'Service description must be at least 10 characters long.',
            'string.max': 'Service description must not exceed 500 characters.'
        }),

    price: joi.number().min(0).precision(2)
        .messages({
            'number.base': 'Price must be a valid number.',
            'number.min': 'Price cannot be negative.',
            'number.precision': 'Price can have up to 2 decimal places.'
        }),

    duration: joi.number().integer()
        .messages({
            'number.base': 'Duration must be a valid number.',
            'number.integer': 'Duration must be an integer.',
        })
})



