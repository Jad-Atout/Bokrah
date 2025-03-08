import express from "express";
import {customerRegister, deleteCustomer, getClientCustomers, updateCustomer,createCustomer} from "./customer.controller.js";
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