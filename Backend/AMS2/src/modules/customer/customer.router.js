import express from "express";
import {
    deleteCustomer,
    getClientCustomers,
    updateCustomer,
    createCustomer,
    getCustomersCount,
    toggleBlockCustomer,
    getCustomerById,
    getCustomerAppointments
} from "./customer.controller.js";
import {asyncHandler} from "../../utils/catchError.js";
import {validationHandler} from "../../middleware/validation.js";
import {createLocalCustomerSchema,createCustomerSchema} from "./customer.validation.js";
import {auth, roles} from "../../middleware/auth.js";
const router = express.Router({mergeParams: true});


router.post('/create',
    auth([roles.Client,roles.Staff]),
    validationHandler(createCustomerSchema)
    ,asyncHandler(createCustomer)
);

router.patch('/block/:customerId',
    auth(roles.Client),
    asyncHandler(toggleBlockCustomer)
)

router.patch('/:customerId',
    auth(roles.Client,roles.Customer),
    asyncHandler(updateCustomer)
)
router.delete('/:customerId',
    auth(roles.Customer),
    asyncHandler(deleteCustomer)
)

router.get('/',auth(roles.Client,roles.Staff),asyncHandler(getClientCustomers))

router.get('/count',auth([roles.Admin]), getCustomersCount);

router.get('/:customerId/appointments', auth(roles.Client, roles.Customer), asyncHandler(getCustomerAppointments));

router.get('/:customerId', auth(roles.Client, roles.Customer), asyncHandler(getCustomerById));

export default router