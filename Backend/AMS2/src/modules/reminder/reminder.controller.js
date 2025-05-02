// controllers/reminder.js
import reminderModel from "../../../DB/models/reminder.js";

export const setReminderSettings = async (req, res) => {
  const { clientId } = req.params;
  const {
    reminderTimes,     // array of minute-values
    reminderMethods,   // array of strings, e.g. ["email","SMS"]
    enabled            // optional boolean
  } = req.body;

  try {
    let reminder = await reminderModel.findOne({ clientId });
    if (reminder) {
      // Update existing settings
      reminder.reminderTimes = reminderTimes || [];
      reminder.reminderMethods = reminderMethods || [];
      if (typeof enabled === "boolean") {
        reminder.enabled = enabled;
      }
    } else {
      // Create new settings
      reminder = new reminderModel({
        clientId,
        reminderTimes: reminderTimes || [],
        reminderMethods: reminderMethods || [],
        enabled: typeof enabled === "boolean" ? enabled : true
      });
    }

    await reminder.save();
    return res
      .status(200)
      .json({ message: "Reminder settings saved successfully", reminder });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "Failed to save reminder settings" });
  }
};


export const getReminderSettings = async (req, res) => {
    const { clientId } = req.params;
  
    try {
      const reminder = await reminderModel.findOne({ clientId });
      if (!reminder) {
        return res.status(404).json({ message: "No reminder settings found for this client." });
      }
  
      return res.status(200).json({ reminder });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to retrieve reminder settings" });
    }
  };