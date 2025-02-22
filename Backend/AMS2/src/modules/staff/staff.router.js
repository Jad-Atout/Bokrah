import {Router} from "express";
import {asyncHandler} from "../../utils/catchError.js";
import {validationHandler} from "../../middleware/validation.js";
import {createStaffValidationSchema} from "./staff.validation.js";
import {createStaff, getClientStaff,updateStaff,deleteStaff} from "./staff.controler.js";
import {auth,roles} from "../../middleware/auth.js"


const router = Router();

router.get('/:clientId',
    asyncHandler(getClientStaff))

router.post('/',
    auth(roles.Client),
    validationHandler(createStaffValidationSchema),
     asyncHandler(createStaff)
)
router.patch('/:staffId',auth(roles.Client),updateStaff)
router.delete('/:staffId',auth(roles.Client),deleteStaff)



export default router;