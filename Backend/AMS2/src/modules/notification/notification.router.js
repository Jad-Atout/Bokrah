import express from "express";
import {
    getNotifications,
    markNotificationAsRead,
    deleteNotification,
    sendNotification
} from "./notification.controller.js";
import {auth, roles} from "../../middleware/auth.js";
import {asyncHandler} from "../../utils/catchError.js";

const router = express.Router();

router.get("/", auth([roles.Client,roles.Admin,roles.Staff,roles.Customer]), getNotifications);
router.patch("/:notificationId/markAsRead", auth([roles.Client,roles.Admin,roles.Staff,roles.Customer]), markNotificationAsRead);
router.delete("/:notificationId", auth([roles.Client,roles.Admin,roles.Staff,roles.Customer]), deleteNotification);
router.post('/',auth([roles.Admin]),asyncHandler(sendNotification))
export default router;
