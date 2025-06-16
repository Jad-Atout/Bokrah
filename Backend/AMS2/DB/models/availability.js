import mongoose from "mongoose";

const AvailabilitySchema = new mongoose.Schema(
    {
        timeZone: {
            type: String,
            default: "Asia/Gaza",  // Default time zone value
        },
        availability: {
            type: [
                {
                    day: {
                        type: String,
                        required: true,
                        enum: [
                            "Monday", "Tuesday", "Wednesday", "Thursday",
                            "Friday", "Saturday", "Sunday"
                        ],  // Restrict days to valid weekdays
                    },
                    slots: {
                        type: [
                            {
                                startTime: {
                                    type: String,
                                    required: true,
                                },
                                endTime: {
                                    type: String,
                                    required: true,
                                }
                            }
                        ],
                        default: [], // Default empty array for slots if not provided
                    }
                }
            ],
            default: [
                {
                    day: "Monday",
                    slots: [
                        { startTime: "08:00 AM", endTime: "04:00 PM" }
                    ]
                },
                {
                    day: "Tuesday",
                    slots: [
                        { startTime: "08:00 AM", endTime: "04:00 PM" }
                    ]
                },
                {
                    day: "Wednesday",
                    slots: [
                        { startTime: "08:00 AM", endTime: "04:00 PM" }
                    ]
                },
                {
                    day: "Thursday",
                    slots: [
                        { startTime: "08:00 AM", endTime: "04:00 PM" }
                    ]
                },
                {
                    day: "Friday",
                    slots: []  // No available slots for Friday
                },
                {
                    day: "Saturday",
                    slots: []  // No available slots for Saturday
                },
                {
                    day: "Sunday",
                    slots: [
                        { startTime: "08:00 AM", endTime: "04:00 PM" }
                    ]
                }
            ],
        },
    },
    { timestamps: true }
);

export default mongoose.model("Availability", AvailabilitySchema);

