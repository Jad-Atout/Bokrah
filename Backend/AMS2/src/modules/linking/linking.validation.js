import Joi  from "joi";
export const staffServiceAssignmentSchema = Joi.object({
    staffIds: Joi.array()
        .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('Invalid Staff ID format.'))
        .min(1)
        .required()
        .messages({
            'array.base': 'Staff IDs must be an array.',
            'array.min': 'At least one staff ID is required.',
            'any.required': 'Staff IDs are required.'
        }),

    serviceIds: Joi.array()
        .items(Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('Invalid Service ID format.'))
        .default([])
        .messages({
            'array.base': 'Service IDs must be an array.',
            'string.hex': 'Service ID must be a valid hexadecimal string.'
        })
});