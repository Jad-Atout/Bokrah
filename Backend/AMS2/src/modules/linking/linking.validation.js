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
        .min(1)
        .required()
        .messages({
            'array.base': 'Service IDs must be an array.',
            'array.min': 'At least one service ID is required.',
            'any.required': 'Service IDs are required.'
        })
});