import Joi from 'joi';

const channelSchema = Joi.object({
    push: Joi.boolean().messages({
        'boolean.base': '"push" must be a boolean value.'
    }),
    email: Joi.boolean().messages({
        'boolean.base': '"email" must be a boolean value.'
    }),
    sms: Joi.boolean().messages({
        'boolean.base': '"sms" must be a boolean value.'
    })
}).messages({
    'object.base': 'Each notification type must be an object containing "push", "email", and "sms" boolean values.'
});

const preferencesSchema = Joi.object({
    appointmentReminder: channelSchema.optional(),
    appointmentChange: channelSchema.optional()
}).messages({
    'object.base': '"preferences" must be an object containing valid notification types.'
});

export const updateNotificationPreferencesSchema = Joi.object({
    preferences: preferencesSchema.required().messages({
        'any.required': '"preferences" is required in the request body.'
    })
});