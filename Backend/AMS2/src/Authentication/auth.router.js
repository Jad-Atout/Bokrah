import {Router} from 'express'
import {validationHandler} from "../middleware/validation.js";
import {generalLogin} from "./login.auth.js";
import {generalLoginSchema} from "./auth.validation.js";
import {asyncHandler} from "../utils/catchError.js";

const router = Router()

router.post('/login'
    ,asyncHandler(generalLogin)
)


export default router