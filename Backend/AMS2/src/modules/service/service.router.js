import express from 'express';
import {
    createService,
    updateService,
    deleteService,
    getClientServices
} from './service.controller.js';
import {auth,roles} from '../../middleware/auth.js'

const router = express.Router();

// Public routes
router.get('/:clientId', getClientServices);


router.post('/',auth(roles.Client), createService);
router.put('/:id',auth(roles.Client), updateService);
router.delete('/:id',auth(roles.Client), deleteService);


export default router;