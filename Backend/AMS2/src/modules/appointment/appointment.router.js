import {createAppointment} from "./controller/createAppointment.controller.js";
import { Router } from 'express';
import {authServices} from "./appointment.auth.js";
import prepareToken from "../../utils/Google/Services/refreshToken.js";
import {asyncHandler} from "../../utils/catchError.js";
const router = Router();
import {auth, roles} from "../../middleware/auth.js";
import {cancelAppointment} from "./controller/cancelAppointment.controller.js";

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


export default router;