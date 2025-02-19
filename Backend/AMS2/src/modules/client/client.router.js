import express from "express";
import customerRouter from"../customer/customer.router.js"
import {gClientLogin, googleAuthCallback} from "./client.controller.js";
import {asyncHandler} from "../../ults/catchError.js";


const router = express.Router();

router.use('/:clientId/customer',customerRouter);
router.get('/oauth2callback',
    asyncHandler(googleAuthCallback)
)
router.get('/gLogin',
    asyncHandler(gClientLogin)
)


export default router