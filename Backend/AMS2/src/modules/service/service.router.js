import {
    createService,
    updateService,
    deleteService,
    getClientServices, setVisibility
} from './service.controller.js';
import {auth,roles} from '../../middleware/auth.js'
import {asyncHandler} from "../../utils/catchError.js";
import {validationHandler} from "../../middleware/validation.js";
import {createServiceSchema, visibilitySchema} from "./services.validation.js";
import {verifyOwnership} from "./service.auth.js";
import {Router} from "express";

const router = Router();

// Public routes
router.get('/:clientId',
    asyncHandler(getClientServices)
);


router.post('/',
    auth(roles.Client),
    asyncHandler(validationHandler(createServiceSchema))
    , asyncHandler(createService)
);
router.patch('/visible/:serviceId',
    auth(roles.Client),
    asyncHandler(validationHandler(visibilitySchema)),
    asyncHandler(verifyOwnership()),
    asyncHandler(setVisibility)
    )
router.patch('/:serviceId',
    auth(roles.Client),
    asyncHandler(verifyOwnership()),
    asyncHandler(updateService)
);

router.delete('/:serviceId'
    ,auth(roles.Client),
    asyncHandler(verifyOwnership()),
    asyncHandler(deleteService)
);


export default router;