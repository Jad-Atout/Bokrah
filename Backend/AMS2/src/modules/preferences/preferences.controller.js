import NotificationPreference from "../../../DB/models/notifications/UserNotificationPreference.js";
export const getNotificationPreferences = async (req, res) => {
    try {
        const { userId } = req.authUser;

        let prefs = await NotificationPreference.findOne({ userId });
        if (!prefs) {
            prefs = await NotificationPreference.create({ userId });
        }

        return res.status(200).json(prefs);
    } catch (err) {
        return res.status(500).json({
            message: 'Error fetching preferences',
            error: err.message,
        });
    }
};


export const updateNotificationPreferences = async (req, res) => {
    try {
        const { userId } = req.authUser;
        const { preferences } = req.body;

        let prefs = await NotificationPreference.findOne({ userId });
        if (!prefs) {
            prefs = new NotificationPreference({ userId });
        }

        for (const [type, channels] of Object.entries(preferences)) {
            if (!prefs.preferences[type]) prefs.preferences[type] = {};
            for (const [channel, value] of Object.entries(channels)) {
                prefs.preferences[type][channel] = value;
            }
        }

        await prefs.save();
        return res.status(200).json(prefs);
    } catch (err) {
        return res.status(500).json({
            message: 'Error updating preferences',
            error: err.message,
        });
    }
};

// Request sample
// {
//     "preferences": {
//     "appointmentReminder": {
//         "push": true,
//             "email": false,
//             "sms": false
//     },
//     "appointmentChange": {
//         "push": false,
//             "email": true,
//             "sms": true
//     }
//
// }
// }
