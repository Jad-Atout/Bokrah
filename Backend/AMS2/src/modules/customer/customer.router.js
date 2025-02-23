import express from "express";
import {customerLocalRegister, deleteCustomer, getClientCustomers, updateCustomer} from "./customer.controller.js";
import {asyncHandler} from "../../utils/catchError.js";
import {validationHandler} from "../../middleware/validation.js";
import {createLocalCustomerSchema} from "./customer.validation.js";
import {auth, roles} from "../../middleware/auth.js";

const router = express.Router({mergeParams: true});

router.post('/register',
    validationHandler(createLocalCustomerSchema)
    ,asyncHandler(customerLocalRegister)
);
router.post('/login',)

router.put('/:customerID',
    auth(roles.Client),
    validationHandler(createLocalCustomerSchema),
    asyncHandler(updateCustomer)
)
router.delete('/:customerID',
    auth(roles.Customer),
    asyncHandler(deleteCustomer)
)

router.get('/',auth(roles.Client,roles.Staff),asyncHandler(getClientCustomers))

export default router