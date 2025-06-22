import Joi from "joi";

export const generalLoginSchema = Joi.object({
    identifier: Joi.string()
        .required()
        .custom((value, helpers) => {
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            const isPhone = /^\+?[0-9]{10,15}$/.test(value);
            if (!isEmail && !isPhone) {
                return helpers.error("any.invalid");
            }
            return value;
        }, "Email or Phone validation")
        .messages({
            "string.empty": "Identifier is required.",
            "any.invalid": "Identifier must be a valid email or phone number."
        }),

    password: Joi.string()
        .min(6)
        .max(32)
        .pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
        .required()
        .messages({
            "string.empty": "Password is required.",
            "string.min": "Password must be at least 6 characters long.",
            "string.max": "Password must not exceed 32 characters.",
            "string.pattern.base":
                "Password must contain at least one uppercase letter, one number, and one special character."
        })
});
