import {Router} from 'express'
import { generalLogin} from "./login.auth.js";
import {asyncHandler} from "../utils/catchError.js";
import {confirmEmail} from "./confirmEmail.auth.js";
import {setPasswordAndConfirm} from"./resetPasswordAndConfirm.js"
import {forgotPassword, sendCode} from "./forgotPassword.js";
import {changePassword} from "./changePassword.js";
import {customerRegister} from "../modules/customer/customer.controller.js";
import {validationHandler} from "../middleware/validation.js";
import {createLocalCustomerSchema} from "../modules/customer/customer.validation.js";
const router = Router()


router.post('/register',
    validationHandler(createLocalCustomerSchema)
    ,asyncHandler(customerRegister)
);
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

// Change Password (requires authentication)
// You may need to add authentication middleware, e.g. requireAuth, before asyncHandler
router.patch("/change-password",
    asyncHandler(changePassword)
);

export default router