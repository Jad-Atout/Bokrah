import express from "express";
import {createCustomer, getClientCustomers} from "./customer.controller.js";
import {auth,roles} from '../../middleware/auth.js'

const router = express.Router({mergeParams: true});

router.post('/register',createCustomer);

router.get('/',auth(roles.Staff,roles.Customer),getClientCustomers)
// TODO search patch put
//router.patch('/:id',auth(roles.Client),updateCustomer)
//router.delete('/:id',auth(roles.Client),deleteCustomer)

<<<<<<< HEAD
router.get('/',auth(roles.Client,roles.Staff),asyncHandler(getClientCustomers))
=======
>>>>>>> 59aa4d9dea3a06ad168c6944b425a9f3e13b509d
export default router