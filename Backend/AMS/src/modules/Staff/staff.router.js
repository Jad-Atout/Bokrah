import {Router} from 'express';
import {validationHandler} from "../../middleware/validation.js";
import auth from "../../middleware/auth.js";
import checkUserExistence from "../../middleware/checkUserExistence.js";
import {asyncHandler} from "../../utils/catchError.js";
import {createStaff} from "./staff.controller.js";
import {createStaffSchema} from "./staff.validation.js";
import {verifyRole} from "./staff.auth.js";

const router = Router();

router.post('/register',
    auth(),
    asyncHandler(validationHandler(createStaffSchema)),
    asyncHandler(checkUserExistence()),
    asyncHandler(verifyRole()),
    asyncHandler(createStaff),
    )

export default router;