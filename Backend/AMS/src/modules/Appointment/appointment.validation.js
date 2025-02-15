import joi from "joi";
export const IDValidationSchema = joi.object({
    id: joi.number().integer().positive()
        .messages({
            'number.base': 'ID must be a number.',
            'number.integer': 'ID must be an integer.',
            'number.positive': 'ID must be a positive number.',
            'any.required': 'ID is required.'
        }),
});
export const appointmentIDValidationSchema = joi.object({
    appointmentId:joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            "number.base": "staffId must be a number.",
            "number.integer": "staffId must be an integer.",
            "number.positive": "staffId must be a positive number.",
            "any.required": "staffId is required."
        })
})
export const createAppointmentSchema = joi.object({
    startTime: joi.date()
        .iso()
        .greater("now")
        .required()
        .messages({
            "date.base": "startTime must be a valid date.",
            "date.iso": "startTime must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ).",
            "date.greater": "startTime must be a future date and time.",
            "any.required": "startTime is required."
        }),

    serviceIds: joi.array()
        .items(joi.number().integer().positive().required())
        .min(1)
        .required()
        .messages({
            "array.base": "serviceIds must be an array.",
            "array.min": "serviceIds must contain at least one service ID.",
            "number.base": "Each service ID must be a number.",
            "number.integer": "Each service ID must be an integer.",
            "number.positive": "Each service ID must be a positive number.",
            "any.required": "serviceIds are required."
        }),

    customerId: joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            "number.base": "customerId must be a number.",
            "number.integer": "customerId must be an integer.",
            "number.positive": "customerId must be a positive number.",
            "any.required": "customerId is required."
        }),

    staffId: joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            "number.base": "staffId must be a number.",
            "number.integer": "staffId must be an integer.",
            "number.positive": "staffId must be a positive number.",
            "any.required": "staffId is required."
        }),
    clientId: joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            "number.base": "staffId must be a number.",
            "number.integer": "staffId must be an integer.",
            "number.positive": "staffId must be a positive number.",
            "any.required": "staffId is required."
        })
});
export const appointmentDeleteSchema = joi.object({
    clientId: joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            "number.base": "staffId must be a number.",
            "number.integer": "staffId must be an integer.",
            "number.positive": "staffId must be a positive number.",
            "any.required": "staffId is required."
        }),
    appointmentId:joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            "number.base": "appointmentId must be a number.",
            "number.integer": "appointmentId must be an integer.",
            "number.positive": "appointmentId must be a positive number.",
            "any.required": "appointmentId is required."
        })
})