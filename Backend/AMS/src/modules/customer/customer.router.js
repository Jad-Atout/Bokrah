import {Router} from "express";
import auth from "../../middleware/auth.js";
import {createCustomer, customerLogin, deleteCustomer, getAllCustomers, updateCustomer} from "./customer.controller.js";
import {validationHandler} from "../../middleware/validation.js";
import {customerDeleteSchema, customerUpdateSchema, loginSchema, registerSchema} from "./customer.validation.js";
import {asyncHandler} from "../../utils/catchError.js";
import {verifyRole} from "./customer.auth.js";
import checkUserExistence from "../../middleware/checkUserExistence.js";

const router = Router();
router.get('/',asyncHandler(getAllCustomers))
router.post('/register',
    validationHandler(registerSchema),
    asyncHandler(checkUserExistence()),
    asyncHandler(createCustomer)
)
router.post('/login',
    validationHandler(loginSchema),
    asyncHandler(checkUserExistence())
    ,asyncHandler(customerLogin)
)
router.delete('/:id',
    auth(),
    validationHandler(customerDeleteSchema),
    asyncHandler(checkUserExistence()),
    asyncHandler(verifyRole()),
    asyncHandler(deleteCustomer)
)
router.put('/:id',
    auth(),
    validationHandler(customerUpdateSchema),
    asyncHandler(checkUserExistence()),
    asyncHandler(verifyRole()),
    asyncHandler(updateCustomer)
)


export default router;