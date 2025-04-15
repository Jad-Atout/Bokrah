
# 🧾 Plan & Subscription Management in AMS

This guide provides the structure, database models, and logic needed to implement and manage user subscription plans in your Appointment Management System (AMS). It supports free and paid tiers and sets the foundation for future billing integration.

---

## 📦 Features

- Clients can be on either Free or Paid plans.
- Each plan controls access to premium features.
- Subscription expiration, status, and auto-renew flags are tracked.
- Cron job or BullMQ job checks subscription status periodically.

---

## 📁 1. Mongoose Schemas

### 📄 PlanSchema.js

```js
const mongoose = require("mongoose");

const PlanSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., Free, Pro
  description: String,
  price: { type: Number, default: 0 }, // 0 = free
  durationInDays: { type: Number, required: true }, // e.g., 30
  features: [{ type: String }] // e.g., ['appointments_limit', 'reminders_enabled']
});

module.exports = mongoose.model("Plan", PlanSchema);
```

---

### 📄 SubscriptionSchema.js

```js
const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
  planId: { type: mongoose.Schema.Types.ObjectId, ref: "Plan", required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  autoRenew: { type: Boolean, default: false },
  status: { type: String, enum: ["active", "expired", "cancelled"], default: "active" }
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);
```

---

## 🔧 2. Controller Functions

### ➕ Create Subscription

```js
const createSubscription = async (clientId, planId, autoRenew = false) => {
  const plan = await Plan.findById(planId);
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + plan.durationInDays);

  return await Subscription.create({
    clientId,
    planId,
    startDate: now,
    endDate,
    autoRenew,
    status: "active"
  });
};
```

---

### 🔁 Check Expired Subscriptions (BullMQ Job)

```js
const checkExpiredSubscriptions = async () => {
  const now = new Date();
  const expiredSubs = await Subscription.find({ endDate: { $lt: now }, status: "active" });

  for (const sub of expiredSubs) {
    sub.status = "expired";
    await sub.save();
    // Optional: downgrade client features
  }
};
```

---

### 🚫 Cancel Subscription

```js
const cancelSubscription = async (subscriptionId) => {
  const sub = await Subscription.findById(subscriptionId);
  sub.status = "cancelled";
  sub.autoRenew = false;
  await sub.save();
};
```

---

## 🛂 3. Middleware to Check Subscription Access

```js
const checkSubscription = async (req, res, next) => {
  const clientId = req.user.id;
  const activeSub = await Subscription.findOne({ clientId, status: "active" }).populate("planId");

  if (!activeSub) return res.status(403).json({ message: "No active subscription" });

  req.plan = activeSub.planId;
  next();
};
```

Use this middleware on routes that need subscription access.

---

## 🌐 4. Frontend Integration Notes

- Display plan status & expiration in client dashboard.
- Allow switching plans (cancel + create new).
- Call backend API to create or cancel subscriptions.
- (Future) Integrate Stripe or other billing provider.

---

## 🔮 5. Optional: Add Plan Limits in Logic

For example, limit the number of appointments for the "Free" plan:

```js
const canCreateAppointment = async (clientId) => {
  const sub = await Subscription.findOne({ clientId, status: "active" }).populate("planId");

  const appointmentCount = await Appointment.countDocuments({ clientId });
  if (sub.planId.name === "Free" && appointmentCount >= 5) {
    return false;
  }

  return true;
};
```

---

Let me know if you want:

- API routes for plans and subscriptions
- Admin panel to create/update plans
- Frontend logic/snippets
- Stripe payment integration (mock or real)

Want me to turn this into a Markdown file or push it into a file structure?
