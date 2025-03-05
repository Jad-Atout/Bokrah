import { Router } from 'express';
import {setAvailability, deleteAvailability, getAvailibilty} from "./availability.controller.js";
import {auth, roles} from "../../middleware/auth.js";
import {asyncHandler} from "../../utils/catchError.js";
import {staffAvailabilitySchema} from "./availabilty.validation.js";
import {validationHandler} from "../../middleware/validation.js";

const router = Router();

router.post("/",auth(roles.Client),
    validationHandler(staffAvailabilitySchema),
    asyncHandler(setAvailability)
)

router.delete("/",deleteAvailability)

router.get("/",getAvailibilty)

export default router;