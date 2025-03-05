// scheduler.js
import schedule from "node-schedule";
import { sendEmail } from "./email.js";
// import { sendSMS } from "./sms.js";
import {appointmentConfirmationEmail, appointmentFullDetailsEmail} from "./emailTemplete.js";


export const scheduleReminders = async (
    userName,
    createdAppointments,
    email,
    reminders,
    staffNames,
    allServices,
    appointmentId,
    clientId
) => {
//TODO ,,send the staffs services so each staffs can have an appointment
// create a function that check the sub appointment and from the staff id in sub-appointment fetch
// staff data and send email to him (you have a email-template for staffs I guess use it)

    if (!Array.isArray(createdAppointments) || createdAppointments.length === 0) {
        return;
    }

    const now = new Date();
    console.log("------------------------------");
    console.log("Server local now:", now.toString()); // Local time
    console.log("Server UTC now:  ", now.toUTCString()); // UTC
    console.log("------------------------------");

    // For each *appointment* (could be multiple if you have recurrence)
    for (const appointment of createdAppointments) {
        const apptId = appointment._id.toString();

        console.log("🔍 Checking appointment:", appointment);

        // Validate subAppointments
        if (!Array.isArray(appointment.subAppointments) || appointment.subAppointments.length === 0) {
            console.error("❌ No subAppointments found:", appointment);
            continue;
        }

        // For each *reminder* in your reminder settings
        for (let i = 0; i < reminders.length; i++) {
            const { minutes, method } = reminders[i];


            const earliestStart = appointment.subAppointments[0].startTime;
            const reminderDate = new Date(earliestStart);
            reminderDate.setMinutes(reminderDate.getMinutes() - minutes);

            if (isNaN(reminderDate)) {
                console.error("❌ Invalid date format for startTime:", earliestStart);
                continue;
            }

            console.log(`⏰ Reminder #${i} for appointment at:`);
            console.log("   - reminderDate local:", reminderDate.toString());
            console.log("   - reminderDate UTC:  ", reminderDate.toUTCString());
            console.log("   - offset (minutes):  ", minutes);

            // Only schedule if reminder time is in the future
            if (reminderDate > now) {
                console.log("   -> Scheduling this reminder...");
                schedule.scheduleJob(reminderDate, async () => {
                    console.log(
                        `🔔 Sending ${method} reminder for appointment with earliest startTime at ${earliestStart}`
                    );

                    if (method === "email") {
                        // Send a SINGLE email that has ALL sub-appointments
                        await sendEmail(
                            email,
                            "Appointment Reminder: Full Details",
                            await appointmentFullDetailsEmail(
                                userName,
                                staffNames,
                                allServices,
                                appointment.subAppointments,  // pass the entire subAppointments array
                                apptId,
                                clientId
                            )
                        );
                    }
                    // else if (method === "SMS") {...}
                    // else if (method === "popup") {...}
                });
            } else {
                console.log(
                    `❗ Skipped scheduling a reminder in the past:
           reminderDate local = ${reminderDate.toString()},
           reminderDate UTC   = ${reminderDate.toUTCString()}`
                );
            }
        }
    }
};
