import  {Router} from "express"
import {assignServiceStaff,} from "./linking.controller.js";
import {auth,roles} from '../../middleware/auth.js'
import {validationHandler} from "../../middleware/validation.js";
import {staffServiceAssignmentSchema} from "./linking.validation.js";
import {asyncHandler} from "../../utils/catchError.js";

const router = Router()


router.post('/staffService',auth(roles.Client),validationHandler(staffServiceAssignmentSchema),asyncHandler(assignServiceStaff));



export default router