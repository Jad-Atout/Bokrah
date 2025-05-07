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
import upload from "../../utils/multer.js";

const router = express.Router();
router.post("/check/:clientId",asyncHandler(prepareToken()))
router.use("/:clientId/newCustomer", customerRouter);

router.get("/", auth(roles.Admin), asyncHandler(getClients));
router.get("/:clientId", auth([roles.Admin, roles.Client]), asyncHandler(getClientById));
router.patch("/", auth(roles.Client), upload.single('logo'), asyncHandler(updateClient));
router.delete("/", auth(roles.Client), asyncHandler(deleteClient));

router.get("/auth/google", asyncHandler(gClientLogin));
router.get("/auth/google/callback", asyncHandler(googleAuthCallback));
router.get("/oauth2callback", asyncHandler(googleAuthCallback));

export default router;
