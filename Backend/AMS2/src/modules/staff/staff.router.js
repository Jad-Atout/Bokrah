import {Router} from "express";
import {asyncHandler} from "../../utils/catchError.js";
import {validationHandler} from "../../middleware/validation.js";
import {createStaffValidationSchema} from "./staff.validation.js";
import {createStaff, getClientStaff} from "./staff.controler.js";
import {auth} from "../../middleware/auth.js"


const router = Router();

router.get('/:clientId',
    asyncHandler(getClientStaff))

router.post('/',
    auth(),
    validationHandler(createStaffValidationSchema),
     asyncHandler(createStaff)
)
router.put('/:staffId')
router.delete('/:staffId')



export default router;