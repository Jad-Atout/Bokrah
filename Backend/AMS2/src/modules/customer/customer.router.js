import express from "express";
import {createCustomer, getClientCustomers} from "./customer.controller.js";
import {auth,roles} from '../../middleware/auth.js'

const router = express.Router({mergeParams: true});

router.post('/register',createCustomer);

router.get('/',auth(roles.Staff,roles.Customer),getClientCustomers)
// TODO search patch put
//router.patch('/:id',auth(roles.Client),updateCustomer)
//router.delete('/:id',auth(roles.Client),deleteCustomer)

export default router