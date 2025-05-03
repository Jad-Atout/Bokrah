import {Router} from 'express';
import {roles,auth} from "../../middleware/auth.js";
import {asyncHandler} from "../../utils/catchError.js";
import {getNotificationPreferences, updateNotificationPreferences} from "./preferences.controller.js";
import {validationHandler} from "../../middleware/validation.js";
import {updateNotificationPreferencesSchema} from "./preferences.validation.js";
const router = Router();

router.patch('/',auth([roles.Client,roles.Admin,roles.Staff,roles.Customer]),validationHandler(updateNotificationPreferencesSchema),
    asyncHandler(updateNotificationPreferences)
)
router.get('/', auth([roles.Client,roles.Admin,roles.Staff]),
    asyncHandler(getNotificationPreferences));
export default router;