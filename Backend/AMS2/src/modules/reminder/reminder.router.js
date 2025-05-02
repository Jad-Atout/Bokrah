import express from 'express';
import {
    setReminderSettings,
    getReminderSettings
} from './reminder.controller.js';

import {auth,roles} from '../../middleware/auth.js'
import {asyncHandler} from "../../utils/catchError.js";
import {validationHandler} from "../../middleware/validation.js";

const router = express.Router();



router.post("/:clientId",auth(roles.Client), setReminderSettings);

router.get("/:clientId", auth(roles.Client), getReminderSettings);



export default router;