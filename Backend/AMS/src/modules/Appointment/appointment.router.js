import {Router} from 'express';
import auth from "../../middleware/auth.js";
import {validationHandler} from "../../middleware/validation.js";
import {appointmentIDValidationSchema} from "./appointment.validation.js";
import {asyncHandler} from "../../utils/catchError.js";
import prepareToken from "../../utils/google/refreshAccessToken.js";
import {getAppointments} from "./appointment.controllers/getAppointment.controller.js";

const router = Router();


router.get('/:id',
    auth(),
    validationHandler(appointmentIDValidationSchema),
    asyncHandler(getAppointments),
    )


export default router