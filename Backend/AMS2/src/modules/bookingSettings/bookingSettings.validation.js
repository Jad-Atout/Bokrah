import Joi from "joi";

export const updateBookingSettingsSchema = Joi.object({
    cancellationPolicy: Joi.string()
        .valid("anytime", "1 hour", "2 hours", "4 hours", "6 hours")
        .optional(),
    
    bookingFlow: Joi.object({
        skipTeamMembers: Joi.boolean().optional(),
        provideMultipleServices: Joi.boolean().optional(),
        anyTeamMember: Joi.boolean().optional(),
        allowOnlineRescheduling: Joi.boolean().optional(),
        allowOnlineCancellations: Joi.boolean().optional()
    }).optional(),
    
    servicesDisplay: Joi.object({
        servicePrices: Joi.boolean().optional(),
        serviceDuration: Joi.boolean().optional(),
        businessHours: Joi.boolean().optional(),
        bookAnotherAppointment: Joi.boolean().optional()
    }).optional(),
    
    bookingPolicy: Joi.object({
        text: Joi.string().allow("").optional(),
        addToHome: Joi.boolean().optional()
    }).optional(),
    
    termsAndConditions: Joi.object({
        link: Joi.string().uri().allow("").optional(),
        requireAgreement: Joi.boolean().optional()
    }).optional(),
    
    confirmationRedirect: Joi.string().uri().allow("").optional()
}); 