import {Router} from 'express'
import { generalLogin} from "./login.auth.js";
import {asyncHandler} from "../utils/catchError.js";
import {confirmEmail} from "./confirmEmail.auth.js";
import {setPasswordAndConfirm} from"./resetPasswordAndConfirm.js"
import {forgotPassword, sendCode} from "./forgotPassword.js";
import {customerRegister} from "../modules/customer/customer.controller.js";
const router = Router()
//TODO Razan's send code still in the data base
router.post('/login'
    ,asyncHandler(generalLogin)
)
router.post('/confirmEmail/:token'
    ,asyncHandler(confirmEmail)
)
router.post("/set-password/:token",
    asyncHandler(setPasswordAndConfirm)
);
router.post("/customer/register"
    ,asyncHandler(customerRegister))
router.patch("/sendcode",
    asyncHandler(sendCode)
);
router.patch("/forgotPassword",
    asyncHandler(forgotPassword)
);

export default router