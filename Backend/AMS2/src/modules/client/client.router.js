import express from "express";
import customerRouter from"../customer/customer.router.js"
import {deleteClient, gClientLogin, googleAuthCallback, updateClient} from "./client.controller.js";
import {asyncHandler} from "../../utils/catchError.js";
import {auth, roles} from "../../middleware/auth.js";


const router = express.Router();

router.use('/:clientId/newCustomer',customerRouter);

router.get('/oauth2callback',
    asyncHandler(googleAuthCallback)
)
router.get('/gLogin',
    asyncHandler(gClientLogin)
)

router.patch('/',
    auth(roles.Client),
    asyncHandler(updateClient)
)


router.delete('/clientId',
    auth(roles.Client),
    asyncHandler(deleteClient)
)


export default router