import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  plan: { type: String, enum: ["Free", "Basic", "Premium"], required: true },
  status: { type: String, enum: ["Active", "Pending", "Expired"], required: true },
  joinDate: { type: Date, required: true },
  renewalDate: { type: Date, required: true },
  lastPaymentDate: { type: Date },
  subscriptionId: { type: String, unique: true, required: true }
}, { timestamps: true });

export default mongoose.model("Subscription", SubscriptionSchema);
