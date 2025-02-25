import { Router } from 'express';
import {setAvailability,deleteAvailability} from "./availability.controller.js";

const router = Router();

router.post("/",setAvailability)

router.delete("/",deleteAvailability)


export default router;