import {Router} from "express";
import {asyncHandler} from "../../utils/catchError.js";
import {validationHandler} from "../../middleware/validation.js";
import {createStaffValidationSchema} from "./staff.validation.js";
import {
    createStaff,
    getClientStaff,
    updateStaff,
    deleteStaff,
    deleteAllAppointmentsForStaff,
    getStaffById
} from "./staff.controller.js";
import {auth,roles} from "../../middleware/auth.js"
import prepareToken from "../../utils/Google/Services/refreshToken.js";
import {verifyOwnership} from "./staff.auth.js";


const router = Router();

router.get('/:clientId',
    asyncHandler(getClientStaff))

router.get('/details/:staffId',
    auth(roles.Client),
    asyncHandler(getStaffById))

router.post('/',
    auth(roles.Client),
    validationHandler(createStaffValidationSchema),
    asyncHandler(prepareToken()),
    asyncHandler(createStaff)
)

router.patch('/:staffId',
    auth(roles.Client),
    asyncHandler(verifyOwnership()),
    asyncHandler(updateStaff),
    )

router.delete('/:staffId',
    auth(roles.Client),
    asyncHandler(verifyOwnership()),
    asyncHandler(prepareToken()),
    asyncHandler(deleteStaff),
)

router.delete(
    "/:staffId/appointments",
    auth(roles.Client),
    asyncHandler(verifyOwnership()),
    asyncHandler(deleteAllAppointmentsForStaff)
);


export default router;