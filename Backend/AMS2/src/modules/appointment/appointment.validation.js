import Joi from 'joi';


const staffServiceSchema = Joi.object({
    staffId: Joi.string().hex().length(24).required().messages({
        'string.base': 'Staff ID must be a string.',
        'string.hex': 'Staff ID must be a valid hexadecimal string.',
        'string.length': 'Staff ID must be exactly 24 characters long.',
        'any.required': 'Staff ID is required.'
    }),
    services: Joi.array().items(
        Joi.string().hex().length(24).required().messages({
            'string.base': 'Service ID must be a string.',
            'string.hex': 'Service ID must be a valid hexadecimal string.',
            'string.length': 'Service ID must be exactly 24 characters long.',
            'any.required': 'Service ID is required.'
        })
    ).min(1).required().messages({
        'array.base': 'Services must be an array.',
        'array.min': 'At least one service ID must be provided.',
        'any.required': 'Services are required.'
    })
});

const recurrenceSchema = Joi.object({
    type: Joi.string().valid('daily', 'weekly', 'monthly').required().messages({
        'string.base': 'Recurrence type must be a string.',
        'any.only': 'Recurrence type must be one of "daily", "weekly", or "monthly".',
        'any.required': 'Recurrence type is required.'
    }),
    interval: Joi.number().integer().min(1).required().messages({
        'number.base': 'Interval must be a number.',
        'number.integer': 'Interval must be an integer.',
        'number.min': 'Interval must be at least 1.',
        'any.required': 'Interval is required.'
    }),
    count: Joi.number().integer().min(1).required().messages({
        'number.base': 'Count must be a number.',
        'number.integer': 'Count must be an integer.',
        'number.min': 'Count must be at least 1.',
        'any.required': 'Count is required.'
    }),
    endDate: Joi.date().greater('now').optional().messages({
        'date.base': 'End date must be a valid date.',
        'date.greater': 'End date must be in the future.'
    })
}).optional();


const subSlotSchema = Joi.object({
    startTime: Joi.date().iso().greater('now').required().messages({
        'date.base': 'Start time must be a valid date.',
        'date.isoDate': 'Start time must be in ISO format.',
        'date.greater': 'Start time must be in the future.',
        'any.required': 'Start time is required.'
    }),
    endTime: Joi.date().iso().greater(Joi.ref('startTime')).required().messages({
        'date.base': 'End time must be a valid date.',
        'date.isoDate': 'End time must be in ISO format.',
        'date.greater': 'End time must be greater than start time.',
        'any.required': 'End time is required.'
    }),
    staffServices: Joi.array().items(staffServiceSchema).min(1).required().messages({
        'array.base': 'Staff services must be an array.',
        'array.min': 'At least one staff service must be provided.',
        'any.required': 'Staff services are required.'
    })
});


const slotSchema = Joi.object({
    startTime: Joi.date().iso().greater('now').required().messages({
        'date.base': 'Start time must be a valid date.',
        'date.isoDate': 'Start time must be in ISO format.',
        'date.greater': 'Start time must be in the future.',
        'any.required': 'Start time is required.'
    }),
    endTime: Joi.date().iso().greater(Joi.ref('startTime')).required().messages({
        'date.base': 'End time must be a valid date.',
        'date.isoDate': 'End time must be in ISO format.',
        'date.greater': 'End time must be greater than start time.',
        'any.required': 'End time is required.'
    }),
    subSlots: Joi.array().items(subSlotSchema).min(1).required().messages({
        'array.base': 'SubSlots must be an array.',
        'array.min': 'At least one subSlot service must be provided.',
        'any.required': 'SubSlots are required.'
    })
});

export const createAppointmentSchema = Joi.object({
    customerId: Joi.string().hex().length(24).messages({
        'string.base': 'Customer ID must be a string.',
        'string.hex': 'Customer ID must be a valid hexadecimal string.',
        'string.length': 'Customer ID must be exactly 24 characters long.'
    }),
    userId: Joi.string().hex().length(24).messages({
        'string.base': 'User ID must be a string.',
        'string.hex': 'User ID must be a valid hexadecimal string.',
        'string.length': 'User ID must be exactly 24 characters long.'
    }),
    slot: slotSchema.required().messages({
        'any.required': 'Slot is required.',
        'object.base': 'Slot must be of type object.'
    }),
    clientId: Joi.string().hex().length(24).required().messages({
        'string.base': 'Client ID must be a string.',
        'string.hex': 'Client ID must be a valid hexadecimal string.',
        'string.length': 'Client ID must be exactly 24 characters long.',
        'any.required': 'Client ID is required.'
    })
}).xor('customerId', 'userId');


export const updateAppointmentSchema = Joi.object({
    appointmentId: Joi.string().hex().length(24).required().messages({
        'string.base': 'Appointment ID must be a string.',
        'string.hex': 'Appointment ID must be a valid hexadecimal string.',
        'string.length': 'Appointment ID must be exactly 24 characters long.',
        'any.required': 'Appointment ID is required.'
    }),
    slot: slotSchema.required().messages({
        'any.required': 'Slot is required.',
        'object.base': 'Slot must be of type object.'
    }),
    clientId:Joi.string().hex().length(24).required().messages({
        'string.base': 'Client ID must be a string.',
        'string.hex': 'Client ID must be a valid hexadecimal string.',
        'string.length': 'Client ID must be exactly 24 characters long.',
        'any.required': 'Client ID is required.'
    })
});


export const timeSlotSchema = Joi.object({
    startDate: Joi.date().iso().min('now').required().messages({
        'date.base': 'Start date must be a valid date.',
        'date.isoDate': 'Start date must be in ISO format.',
        'date.min': 'Start date must be today or in the future.',
        'any.required': 'Start date is required.'
    }),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required().messages({
        'date.base': 'End date must be a valid date.',
        'date.isoDate': 'End date must be in ISO format.',
        'date.greater': 'End date must be greater than start date.',
        'any.required': 'End date is required.'
    }),
    recurrence: recurrenceSchema.messages({
        'any.required': 'Recurrence data is invalid.'
    }),
    staffsServices: Joi.array().items(staffServiceSchema).min(1).required().messages({
        'array.base': 'Staff services must be an array.',
        'array.min': 'At least one staff service must be provided.',
        'any.required': 'Staff services are required.'
    }),
    clientId: Joi.string().hex().length(24).required().messages({
        'string.base': 'Client ID must be a string.',
        'string.hex': 'Client ID must be a valid hexadecimal string.',
        'string.length': 'Client ID must be exactly 24 characters long.',
        'any.required': 'Client ID is required.'
    })
});

