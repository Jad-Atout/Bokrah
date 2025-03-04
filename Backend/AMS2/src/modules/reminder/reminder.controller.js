
import reminderModel from '../../../DB/models/reminder.js';


export const setReminderSettings = async (req, res) => {
    const { clientId } = req.params;
    const { reminderTimes, reminderMethods } = req.body;

    try {
        let reminder = await reminderModel.findOne({ clientId });

        if (reminder) {
            // Update existing settings
            reminder.reminderTimes = reminderTimes;
            reminder.reminderMethods = reminderMethods;
        } else {
            // Create new settings
            reminder = new reminderModel({ clientId, reminderTimes, reminderMethods });
        }

        await reminder.save();
        res.status(200).json({ message: "Reminder settings saved successfully", reminder });
    } catch (error) {
        res.status(500).json({ error: "Failed to save reminder settings" });
    }
};
