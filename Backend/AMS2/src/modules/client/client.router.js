import express from "express";
import customerRouter from "../customer/customer.router.js";
import {
    deleteClient,
    gClientLogin,
    getClients,
    googleAuthCallback,
    updateClient,
    getClientById,
} from "./client.controller.js";
import { asyncHandler } from "../../utils/catchError.js";
import { auth, roles } from "../../middleware/auth.js";
import prepareToken from "../../utils/Google/Services/refreshToken.js";

const router = express.Router();
router.post("/check/:clientId",asyncHandler(prepareToken()))
router.use("/:clientId/newCustomer", customerRouter);

router.get("/oauth2callback", asyncHandler(googleAuthCallback));

router.get("/gLogin", asyncHandler(gClientLogin));

router.get("/details", auth([roles.Admin]), asyncHandler(getClients));

router.patch("/", auth(roles.Client), asyncHandler(updateClient));

router.delete("/", auth(roles.Client), asyncHandler(deleteClient));

router.get("/:clientId", auth([roles.Client]), asyncHandler(getClientById));

export default router;
