import {Router} from 'express'
import {validationHandler} from "../middleware/validation.js";
import {confirmEmail, generalLogin} from "./login.auth.js";
import {generalLoginSchema} from "./auth.validation.js";
import {asyncHandler} from "../utils/catchError.js";

const router = Router()

router.post('/login'
    ,asyncHandler(generalLogin)
)
router.post('/confirmEmail/:token'
    ,asyncHandler(confirmEmail)
)


export default router