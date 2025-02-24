import express from 'express';
import {
    createService,
    updateService,
    deleteService,
    getClientServices
} from './service.controller.js';
import {auth,roles} from '../../middleware/auth.js'
import {asyncHandler} from "../../utils/catchError.js";
import {validationHandler} from "../../middleware/validation.js";
import {createServiceSchema} from "./services.validation.js";
import {verifyOwnership} from "./service.auth.js";

const router = express.Router();

// Public routes
router.get('/:clientId',
    asyncHandler(getClientServices)
);


router.post('/',
    auth(roles.Client),
    asyncHandler(validationHandler(createServiceSchema))
    , asyncHandler(createService)
);

router.put('/:serviceId',
    auth(roles.Client),
    asyncHandler(verifyOwnership),
    asyncHandler(updateService)
);

router.delete('/:serviceId'
    ,auth(roles.Client),
    asyncHandler(verifyOwnership),
    asyncHandler(deleteService)
);


export default router;