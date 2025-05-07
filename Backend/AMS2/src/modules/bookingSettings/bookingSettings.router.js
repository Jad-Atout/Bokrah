import { Router } from 'express';
import { auth, roles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/catchError.js";
import { getBookingSettings, updateBookingSettings } from "./bookingSettings.controller.js";
import { validationHandler } from "../../middleware/validation.js";
import { updateBookingSettingsSchema } from "./bookingSettings.validation.js";

const router = Router();

// Get booking settings
router.get('/',
    auth([roles.Client]),
    asyncHandler(getBookingSettings)
);

// Update booking settings
router.put('/',
    auth([roles.Client]),
    validationHandler(updateBookingSettingsSchema),
    asyncHandler(updateBookingSettings)
);

export default router; 