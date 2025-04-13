import {
    createAppointment,
    getAppointmentsByCustomer,
    getAppointmentsCount
} from "./controller/createAppointment.controller.js";
import { Router } from 'express';
import {authServices, authSlots, verifyAppointmentOwnership} from "./appointment.auth.js";
import prepareToken from "../../utils/Google/Services/refreshToken.js";
import {asyncHandler} from "../../utils/catchError.js";
const router = Router();
import {auth, roles} from "../../middleware/auth.js";
import {cancelAppointment} from "./controller/cancelAppointment.controller.js";
import {generateAvailableSlots} from "./controller/getAvailableTimeSlots.js";
import {deleteAppointment} from "./controller/deleteAppointment.controller.js";
import {updateAppointment} from "./controller/updateAppointment.controller.js";
import {cancelSubAppointment} from "./controller/subappointments.controller.js";
import {validationHandler} from "../../middleware/validation.js";
import {createAppointmentSchema, timeSlotSchema, updateAppointmentSchema} from "./appointment.validation.js";
import {getAppointments, getStaffAppointments} from "./controller/getAppointment.controller.js";

const role = [roles.Client,roles.Staff,roles.Customer]
router.post('/:clientId',
    auth(role),
    asyncHandler(authServices()),
    asyncHandler(prepareToken()),
    asyncHandler(createAppointment)
)
router.patch('/:clientId',
    auth(role),
    asyncHandler(verifyAppointmentOwnership()),
    asyncHandler(authServices()),
    asyncHandler(prepareToken()),
    asyncHandler(updateAppointment)
)
router.patch('/:clientId/cancel',
    auth(role),
    asyncHandler(verifyAppointmentOwnership()),
    asyncHandler(prepareToken()),
    asyncHandler(cancelAppointment)
)
router.delete('/:clientId/',
    auth(role),
    asyncHandler(verifyAppointmentOwnership()),
    asyncHandler(prepareToken()),
    asyncHandler(deleteAppointment)
)
router.post('/slots/:clientId',
    validationHandler(timeSlotSchema),
    asyncHandler(authSlots()),
    asyncHandler(prepareToken()),
    asyncHandler(generateAvailableSlots)
)
// no longer needed
router.delete('/:clientId/:appointmentId/:subAppointmentId',
    auth(role),
    asyncHandler(prepareToken()),
    asyncHandler(cancelSubAppointment))

router.get('/count', auth([roles.Admin]),
    asyncHandler(getAppointmentsCount));

router.get('/',
    auth([roles.Client])
    ,asyncHandler(getAppointments));

router.get('/staff/:staffId',
    auth([roles.Client]),
    asyncHandler(getStaffAppointments))

router.get(
    "/customer/:customerId",
    auth([roles.Client]),
    getAppointmentsByCustomer
);

export default router;