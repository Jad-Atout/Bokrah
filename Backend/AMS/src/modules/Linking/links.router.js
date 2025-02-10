import {Router} from 'express'
import clientAuth from "../../middleware/clientAuth.js";
import auth from "../../middleware/auth.js";
import {asyncHandler} from "../../utils/catchError.js";
import {validationHandler} from "../../middleware/validation.js";
import {assignServicesToStaffSchema} from "./links.validation.js";
import {assignServicesToStaff} from "./staffServices.link.js";
const router = Router()

router.post('/StaffServices/:staffID',
    auth(),
    asyncHandler(clientAuth()),
    asyncHandler(validationHandler(assignServicesToStaffSchema)),
    asyncHandler(assignServicesToStaff))


export default router