import {Router} from 'express';
import auth from "../../middleware/auth.js";
import {validationHandler} from "../../middleware/validation.js";
import {appointmentIDValidationSchema, createAppointmentSchema, IDValidationSchema} from "./appointment.validation.js";
import {asyncHandler} from "../../utils/catchError.js";
import prepareToken from "../../utils/google/refreshAccessToken.js";
import {
    getCustomerAppointment,
    getUserAppointments
} from "./appointment.controllers/getAppointment.controller.js";
import {createAppointment} from "./appointment.controllers/createAppointment.controller.js";
import {authServices, checkAppointmentExistence} from "./appointment.auth.js";
import {deleteAppointment} from "./appointment.controllers/deleteAppointment.controller.js";
import {updateAppointment} from "./appointment.controllers/updateAppointment.controller.js";

const router = Router();


router.get('/',
    auth(),
    validationHandler(IDValidationSchema),
    asyncHandler(getUserAppointments),
    )

router.get('/customer/:id',
    auth(),
    validationHandler(IDValidationSchema),
    asyncHandler(getCustomerAppointment)
)

router.post('/:clientId',
    auth(),
    validationHandler(createAppointmentSchema),
    asyncHandler(authServices()),
    asyncHandler(prepareToken()),
    asyncHandler(createAppointment)
)
// for updating and deleting we need to see if staff or client are auth to change appointment
router.delete('/:appointmentId',
    auth(),
    asyncHandler(appointmentIDValidationSchema),
    asyncHandler(checkAppointmentExistence()),
    asyncHandler(prepareToken()),
    asyncHandler(deleteAppointment)
)

router.put('/:appointmentId',
    auth(),
    asyncHandler(appointmentIDValidationSchema),
    asyncHandler(checkAppointmentExistence()),
    asyncHandler(prepareToken()),
    asyncHandler(updateAppointment)
)

export default router