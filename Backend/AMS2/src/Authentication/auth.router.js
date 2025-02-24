import {Router} from 'express'
import {validationHandler} from "../middleware/validation.js";
import { generalLogin} from "./login.auth.js";
import {generalLoginSchema} from "./auth.validation.js";
import {asyncHandler} from "../utils/catchError.js";
import {confirmEmail} from "./confirmEmail.auth.js";
import {setPasswordAndConfirm} from"./resetPasswordAndConfirm.js"
import {forgotPassword, sendCode} from "./forgotPassword.js";
const router = Router()

router.post('/login'
    ,asyncHandler(generalLogin)
)
router.post('/confirmEmail/:token'
    ,asyncHandler(confirmEmail)
)
router.post("/set-password/:token",
    asyncHandler(setPasswordAndConfirm)
);

router.patch("/sendcode",
    asyncHandler(sendCode)
);
router.patch("/forgotPassword",
    asyncHandler(forgotPassword)
);

export default router