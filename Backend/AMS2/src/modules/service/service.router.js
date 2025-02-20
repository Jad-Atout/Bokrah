import express from 'express';
import {
    createService,
    updateService,
    deleteService,
    getBusinessServices
} from '../service/service.controller.js';
import {auth,roles} from '../../middleware/auth.js'

const router = express.Router();

// Public routes
router.get('/business/:clientId', getBusinessServices);


router.post('/',auth(roles.Client), createService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);


export default router;