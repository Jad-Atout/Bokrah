import { Router } from 'express';
import {validationHandler} from "../../middleware/validation.js";
import auth from "../../middleware/auth.js";
import {verifyRole} from "./sevices.auth.js";
import {asyncHandler} from "../../utils/catchError.js";
import {createService, deleteService, updateService} from "./service.controller.js";
import {creatServiceSchema, updateServiceSchema} from "./service.validation.js";
import {idValidationSchema} from "../../utils/validation.schema.js";
import {getClientServices} from "./service.controller.js";

const router = Router();

router.post('/',
    auth(),
    validationHandler(creatServiceSchema),
    asyncHandler(verifyRole()),
    asyncHandler(createService)
)
router.delete('/:id',
    auth(),
    validationHandler(idValidationSchema),
    asyncHandler(verifyRole()),
    asyncHandler(deleteService)
)
router.get('/:id',
    validationHandler(idValidationSchema),
    asyncHandler(getClientServices),
    )
router.put('/:id',auth(),
    validationHandler(updateServiceSchema),
    asyncHandler(verifyRole()),
    asyncHandler(updateService)
    )

export default router;