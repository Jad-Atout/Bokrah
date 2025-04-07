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

const role = [roles.Client,roles.Staff,roles.Customer]
router.post('/:clientId',
    auth(role),
    validationHandler(createAppointmentSchema),
    asyncHandler(authServices()),
    asyncHandler(prepareToken()),
    asyncHandler(createAppointment)
)
router.patch('/:clientId/:appointmentId/cancel',
    auth(role),
    asyncHandler(verifyAppointmentOwnership()),
    asyncHandler(prepareToken()),
    asyncHandler(cancelAppointment)
)
router.delete('/:clientId/:appointmentId',
    auth(role),
    asyncHandler(verifyAppointmentOwnership()),
    asyncHandler(prepareToken()),
    asyncHandler(deleteAppointment)
)
router.patch('/:clientId',
    auth(role),
    validationHandler(updateAppointmentSchema),
    asyncHandler(verifyAppointmentOwnership()),
    asyncHandler(authServices()),
    asyncHandler(prepareToken()),
    asyncHandler(updateAppointment)
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

router.get(
    "/customer/:customerId",
    auth([roles.Client]),
    getAppointmentsByCustomer
);
export default router;