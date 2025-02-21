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

router.put('/:id',
    auth(roles.Client),
    asyncHandler(updateService)
);

router.delete('/:id'
    ,auth(roles.Client),
    asyncHandler(deleteService)
);


export default router;