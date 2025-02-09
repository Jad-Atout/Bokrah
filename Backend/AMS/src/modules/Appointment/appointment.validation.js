import joi from "joi";
export const appointmentIDValidationSchema = joi.object({
    id: joi.number().integer().positive()
        .messages({
            'number.base': 'ID must be a number.',
            'number.integer': 'ID must be an integer.',
            'number.positive': 'ID must be a positive number.',
            'any.required': 'ID is required.'
        }),
});