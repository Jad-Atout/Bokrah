import Joi from "joi";

export const createLocalCustomerSchema = Joi.object({
    userName: Joi.string()
      .min(3)
      .required()
      .messages({
        'string.base': 'User name must be a string.',
        'string.empty': 'User name cannot be empty.',
        'string.min': 'User name must be at least 3 characters long.',
        'any.required': 'User name is required.',
      }),
  
    email: Joi.string()
      .email()
      .optional()
      .allow('')
      .messages({
        'string.base': 'Email must be a string.',
        'string.empty': 'Email cannot be empty.',
        'string.email': 'Please provide a valid email address.',
      }),
  
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.base': 'Password must be a string.',
        'string.empty': 'Password cannot be empty.',
        'string.min': 'Password must be at least 6 characters long.',
        'any.required': 'Password is required.',
      }),
  
    phoneNumber: Joi.string()
      .pattern(/^\+?[0-9\s]{10,20}$/)
      .optional()
      .allow('')
      .custom((value, helpers) => {
        if (!value) return value;
        const digitsOnly = value.replace(/[\s+]/g, '');
        if (digitsOnly.length < 10 || digitsOnly.length > 15) {
          return helpers.error('string.phoneLength');
        }
        return value;
      })
      .messages({
        'string.base': 'Phone number must be a string.',
        'string.empty': 'Phone number cannot be empty.',
        'string.pattern.base': 'Please provide a valid phone number. It may include + prefix and spaces.',
        'string.phoneLength': 'Phone number must contain between 10 and 15 digits (excluding spaces and + symbol).',
      }),
  })
    .or('email', 'phoneNumber') // ✅ require at least one of them
    .messages({
      'object.missing': 'Either email or phone number is required.',
    });
  
const commonDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];

export const createCustomerSchema = Joi.object({
    userName: Joi.string().min(3).max(30).required().messages({
      "string.empty": "User name is required.",
      "string.min": "User name must be at least 3 characters long.",
      "string.max": "User name must not exceed 30 characters.",
    }),
  
    email: Joi.string()
      .email()
      .optional()
      .allow("") 
      .custom((value, helpers) => {
        if (!value) return value; 
        const domain = value.split("@")[1];
        if (!commonDomains.includes(domain)) {
          return helpers.error("string.domain", { domain: commonDomains.join(", ") });
        }
        return value;
      })
      .messages({
        "string.email": "Please enter a valid email address.",
        "string.domain": "Only emails from the following domains are allowed: {#domain}.",
      }),
  
    phoneNumber: Joi.string()
      .optional()
      .allow("") 
      .pattern(/^[0-9]{10,15}$/)
      .messages({
        "string.pattern.base": "Phone number must be between 10 to 15 digits.",
      }),
  })
    .or("email", "phoneNumber") 
    .messages({
      "object.missing": "At least one of email or phone number is required.",
    });
  
//TODO: ensure the validation