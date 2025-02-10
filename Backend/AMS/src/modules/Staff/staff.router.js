import {Router} from 'express';
import {validationHandler} from "../../middleware/validation.js";
import auth from "../../middleware/auth.js";
import checkUserExistence from "../../middleware/checkUserExistence.js";
import {asyncHandler} from "../../utils/catchError.js";
import {createStaff} from "./staff.controller.js";
import {createStaffSchema} from "./staff.validation.js";
import {verifyRole} from "./staff.auth.js";
import prepareToken from "../../utils/google/refreshAccessToken.js";

const router = Router();

router.post('/register/:clientId',
    auth(),
    asyncHandler(validationHandler(createStaffSchema)),
    asyncHandler(checkUserExistence()),
    asyncHandler(verifyRole()),
    asyncHandler(prepareToken()),
    asyncHandler(createStaff),
    )

export default router;