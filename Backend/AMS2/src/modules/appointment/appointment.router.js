import {createAppointment} from "./controller/createAppointment.controller.js";
import { Router } from 'express';
import {authServices} from "./appointment.auth.js";
import prepareToken from "../../utils/Google/Services/refreshToken.js";
import {asyncHandler} from "../../utils/catchError.js";
const router = Router();
import {auth, roles} from "../../middleware/auth.js";
import {cancelAppointment} from "./controller/cancelAppointment.controller.js";
import {generateAvailableSlots} from "./controller/getAvailableTimeSlots.js";
import {deleteAppointment} from "./controller/deleteAppointment.controller.js";
import {updateAppointment} from "./controller/updateAppointment.controller.js";
//TODO create update and delete appointment and also get available time slots
router.post('/:clientId',
    auth(roles.Client),
    asyncHandler(authServices()),
    asyncHandler(prepareToken()),
    asyncHandler(createAppointment)
)
router.patch('/:appointmentId/cancel/:clientId',
    auth(roles.Client),
    asyncHandler(prepareToken()),
    asyncHandler(cancelAppointment)
)
router.delete('/:clientId',
    auth(roles.Client),
    asyncHandler(prepareToken()),
    asyncHandler(deleteAppointment)
)
router.put('/:clientId',
    auth(roles.Client),
    asyncHandler(prepareToken()),
    asyncHandler(updateAppointment)
)
router.post('/slots/:clientId',
    asyncHandler(authServices()),
    asyncHandler(prepareToken()),
    asyncHandler(generateAvailableSlots)
)

export default router;