import { Schema, model, Types } from "mongoose";

const busySlotSchema = new Schema(
    {
        clientId:      { type: Types.ObjectId, ref: "Client", required: true },
        staffId:       { type: Types.ObjectId, ref: "Staff",  required: true },
        slotStart:     { type: Date, required: true },
        expiresAt:     { type: Date, required: true }  // used for TTL
    },
    { versionKey: false }
);

// Unique index to prevent overlapping
busySlotSchema.index(
    { clientId: 1, staffId: 1, slotStart: 1 },
    { unique: true }
);

// TTL index: expires 0 seconds after expiresAt
busySlotSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

export default model("BusySlot", busySlotSchema);
