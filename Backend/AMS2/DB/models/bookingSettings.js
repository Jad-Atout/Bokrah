import mongoose from "mongoose";

const BookingSettingsSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true
    },
    cancellationPolicy: {
        type: String,
        enum: ["anytime", "1 hour", "2 hours", "4 hours", "6 hours"],
        default: "anytime"
    },
    bookingFlow: {
        skipTeamMembers: {
            type: Boolean,
            default: false
        },
        provideMultipleServices: {
            type: Boolean,
            default: false
        },
        anyTeamMember: {
            type: Boolean,
            default: false
        },
        allowOnlineRescheduling: {
            type: Boolean,
            default: false
        },
        allowOnlineCancellations: {
            type: Boolean,
            default: false
        }
    },
    servicesDisplay: {
        servicePrices: {
            type: Boolean,
            default: false
        },
        serviceDuration: {
            type: Boolean,
            default: false
        },
        businessHours: {
            type: Boolean,
            default: false
        },
        bookAnotherAppointment: {
            type: Boolean,
            default: false
        }
    },
    bookingPolicy: {
        text: {
            type: String,
            default: ""
        },
        addToHome: {
            type: Boolean,
            default: false
        }
    },
    termsAndConditions: {
        link: {
            type: String,
            default: ""
        },
        requireAgreement: {
            type: Boolean,
            default: false
        }
    },
    confirmationRedirect: {
        type: String,
        default: ""
    }
}, { timestamps: true });

// Ensure one settings document per client
BookingSettingsSchema.index({ clientId: 1 }, { unique: true });

export default mongoose.model("BookingSettings", BookingSettingsSchema); 