
export const appointmentTemplates = {
    booked: ({ customerName, serviceName, date, time,trigger }) => ({
        title: "Appointment Booked",
        message: `${customerName} booked an appointment for ${serviceName} on ${date} at ${time}.`,
        type: "Appointment",
        triggeredBy:trigger ,
    }),

    canceled: ({ customerName, serviceName, date, time,trigger }) => ({
        title: "Appointment Canceled",
        message: `${customerName} canceled the ${serviceName} appointment on ${date} at ${time}.`,
        type: "Appointment",
        triggeredBy: trigger,
    }),

    updated: ({ customerName, serviceName, oldDate, newDate, oldTime, newTime,trigger }) => ({
        title: "Appointment Rescheduled",
        message: `${customerName} rescheduled ${serviceName} from ${oldDate} ${oldTime} to ${newDate} ${newTime}.`,
        type: "Appointment",
        triggeredBy: trigger,
    }),
};


export const subscriptionTemplates = {
    activated: ({ planName, startDate }) => ({
        title: "Subscription Activated",
        message: `Your subscription to the ${planName} plan has started on ${startDate}.`,
        type: "Subscription",
        triggeredBy: "System",
    }),

    expired: ({ planName, endDate }) => ({
        title: "Subscription Expired",
        message: `Your ${planName} subscription expired on ${endDate}. Please renew to keep using the service.`,
        type: "Subscription",
        triggeredBy: "System",
    }),

    renewalReminder: ({ planName, renewDate }) => ({
        title: "Subscription Renewal Reminder",
        message: `Your ${planName} subscription will renew on ${renewDate}.`,
        type: "Subscription",
        triggeredBy: "System",
    }),
};


export const announcementTemplates = {
    general: ({ title, content }) => ({
        title: title || "New Announcement",
        message: content,
        type: "Announcement",
        triggeredBy: "System",
    }),

    maintenance: ({ date, time }) => ({
        title: "Scheduled Maintenance",
        message: `System will undergo maintenance on ${date} at ${time}. Please save your work.`,
        type: "Announcement",
        triggeredBy: "System",
    }),

    featureLaunch: ({ featureName, launchDate }) => ({
        title: "New Feature Available",
        message: `🎉 ${featureName} is launching on ${launchDate}! Try it out from your dashboard.`,
        type: "Announcement",
        triggeredBy: "System",
    }),

    urgent: ({ message }) => ({
        title: "⚠️ Important Notice",
        message,
        type: "Announcement",
        triggeredBy: "System",
    }),
};
