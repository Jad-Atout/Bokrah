import express from "express";
import {createCustomer, getAllCustomers} from "./customer.controller.js";

const router = express.Router();

router.post('/register',createCustomer);

router.get('/',getAllCustomers)
export default router