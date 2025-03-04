import express from 'express';
import {
    setReminderSettings
} from './reminder.controller.js';

import {auth,roles} from '../../middleware/auth.js'
import {asyncHandler} from "../../utils/catchError.js";
import {validationHandler} from "../../middleware/validation.js";

const router = express.Router();



router.post("/:clientId",auth(roles.Client), setReminderSettings);




export default router;