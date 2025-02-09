import { Router } from 'express';
import {validationHandler} from "../../middleware/validation.js";
import {adminLoginSchema, registerSchema} from "./admin.validation.js";
import {asyncHandler} from "../../utils/catchError.js";
import {adminLogin, adminRegister} from "./admin.controller.js";
import checkUserExistence from "../../middleware/checkUserExistence.js";

const router = new Router();

router.post('/login',
    validationHandler(adminLoginSchema),
    asyncHandler(checkUserExistence()),
    asyncHandler(adminLogin)
)
router.post('/register',
    validationHandler(registerSchema),
    asyncHandler(checkUserExistence()),
    asyncHandler(adminRegister)
)
export default router;