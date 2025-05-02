// reminder.js
import mongoose from "mongoose";

const reminderSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client",
    required: true
  },
  reminderTimes: [
    {
      type: Number,
      required: true
    }
  ],
  reminderMethods: [
    {
      type: String,
      enum: ["email", "SMS", "popup"],
      required: true
    }
  ],
  // Optional: store a toggle if you want
  enabled: {
    type: Boolean,
    default: true
  }
});

export default mongoose.model("Reminder", reminderSchema);



/*
import mongoose from "mongoose";

const ReminderSchema = new mongoose.Schema({
    message: {
        type: String,
        default: "You have an appointment with Jad Atout"
    },
    scheduledTime: {
        type: Date,
        required: true
    },
    deliveryMethod: {
        type: String,
        enum: ["Email", "SMS"],
        default: "Email"
    }
}, { timestamps: true });

export default mongoose.model("Reminder", ReminderSchegma);
*/
