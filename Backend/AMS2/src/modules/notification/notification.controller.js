import {AppError} from "../../utils/AppError.js";
import Notification from "../../../DB/models/notifications/notification.js";
import UserNotificationPreference from "../../../DB/models/notifications/UserNotificationPreference.js";
export const getNotifications = async (req, res, next) => {
    try {
        const {userId} = req.authUser;
        const us = req.authUser
        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 }); // newest first

        return res.status(200).json({
            message: "Success",
            notifications,
        });
    } catch (error) {
        return next(new AppError(`Failed to get notifications: ${error.message}`, 500));
    }
};

export const markNotificationAsRead = async (req, res, next) => {
    try {
        const {userId} = req.authUser;
        const { notificationId } = req.params; // ID of the notification

        // Find and update the notification
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return next(new AppError("Notification not found", 404));
        }

        return res.status(200).json({
            message: "Notification marked as read",
            notification
        });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};

export const deleteNotification = async (req, res, next) => {
    try {
        const userId = req.authUser._id;
        const { notificationId } = req.params;

        const deleted = await Notification.findOneAndDelete({ _id: notificationId, userId });
        if (!deleted) {
            return next(new AppError("Notification not found", 404));
        }

        return res.status(200).json({
            message: "Notification deleted"
        });
    } catch (error) {
        return next(new AppError(error.message, 500));
    }
};


export const sendNotification = async (req, res, next) => {
    const {userIds,template} = req.body
    await createNotification(userIds,template)
    return res.status(200).json({message:"success"})

}



export const createNotification = async (userIds, template,triggeredBy="System") => {
    try {
        const users = Array.isArray(userIds) ? userIds : [userIds];
        const notifications = [];

        for (const uid of users) {
            const userPrefs = await UserNotificationPreference.findOne({ userId: uid });

            const allowed = userPrefs?.preferences?.[template.type];
            if (allowed && !Object.values(allowed).some(Boolean)) continue;

            notifications.push({
                userId: uid,
                ...template,
                triggeredBy,
            });
        }

        return await Notification.insertMany(notifications);
    } catch (err) {
        console.error("❌ Failed to create notification:", err);
        throw err;
    }
};