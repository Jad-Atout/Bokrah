import joi from "joi";

// Validation schema for assigning services to a staff member
export const assignServicesToStaffSchema = {
    params: joi.object({
        staffId: joi.number()
            .integer()
            .positive()
            .required()
            .messages({
                "any.required": "Staff ID is required",
                "number.base": "Staff ID must be a number",
                "number.integer": "Staff ID must be an integer",
                "number.positive": "Staff ID must be a positive integer"
            }),
    }),
    body: joi.object({
        serviceIds: joi.array()
            .items(
                joi.number()
                    .integer()
                    .positive()
                    .required()
                    .messages({
                        "number.base": "Each service ID must be a number",
                        "number.integer": "Each service ID must be an integer",
                        "number.positive": "Each service ID must be a positive integer"
                    })
            )
            .min(1) // Ensure the array has at least 1 service ID
            .required()
            .messages({
                "array.base": "Service IDs must be an array",
                "array.min": "The array of service IDs must contain at least one ID",
                "any.required": "Service IDs are required"
            }),
    }),
};