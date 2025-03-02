import Joi from "joi";

const slotSchema = Joi.object({
    startTime: Joi.string()
        .pattern(/^([0-9]{2}):([0-9]{2})\s?(AM|PM)$/)
        .messages({
            "string.pattern.base": "Start time must be in HH:MM AM/PM format.",
        }),
    endTime: Joi.string()
        .pattern(/^([0-9]{2}):([0-9]{2})\s?(AM|PM)$/)
        .messages({
            "string.pattern.base": "End time must be in HH:MM AM/PM format.",
        }),
});

const availabilitySchema = Joi.object({
    day: Joi.string()
        .valid("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
        .required()
        .messages({
            "any.only": "Invalid day. Must be a valid weekday.",
            "any.required": "Day is required.",
        }),
    slots: Joi.array().items(slotSchema).messages({
        "array.base": "Slots must be an array.",
    }),
});

export const staffAvailabilitySchema = Joi.object({
    staffId: Joi.string().hex().length(24).required().messages({
        "string.hex": "User ID must be a valid 24-character hex string.",
        "any.required": "User ID is required.",
    }),
    timeZone: Joi.string().required().messages({
        "any.required": "Time zone is required.",
        "string.base": "Time zone must be a valid string.",
    }),
    availability: Joi.array().items(availabilitySchema).length(7).required().messages({
        "array.base": "Availability must be an array.",
        "array.length": "Availability must contain 7 days.",
        "any.required": "Availability is required.",
    }),
    __v: Joi.number().optional(),
});

