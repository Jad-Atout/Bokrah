import express from "express";
import {createCustomer, getClientCustomers} from "./customer.controller.js";

const router = express.Router({mergeParams: true});

router.post('/register',createCustomer);

router.get('/',getClientCustomers)
export default router