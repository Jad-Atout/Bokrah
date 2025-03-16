// import { Queue, Worker } from "bullmq";
// import { sendEmail } from "../email.js";
// import { redisConnection } from "./scheduler.js";
//
// // Create a BullMQ Queue for reminder jobs
// const reminderQueue = new Queue("reminderQueue", { connection: redisConnection });
//
// export async function scheduleReminders(appointment, reminderData) {
//     for (const subAppointment of appointment.subAppointments) {
//         for (const reminder of reminderData) {
//             const reminderTime = new Date(subAppointment.startTime);
//             reminderTime.setMinutes(reminderTime.getMinutes() - reminder.minutes);
//
//             if (reminderTime > new Date()) {
//                 await reminderQueue.add("appointmentReminder", {
//                     appointmentId: appointment._id,
//                     subAppointmentId: subAppointment._id,
//                     email: reminder.email,
//                     userName: reminder.userName,
//                     clientId: reminder.clientId,
//                     reminderTime,
//                 }, {
//                     delay: reminderTime - Date.now(),
//                 });
//             }
//         }
//     }
// }
//
// // Reminder worker to handle job execution
// const reminderWorker = new Worker("reminderQueue", async (job) => {
//     const { appointmentId, subAppointmentId, email, userName, clientId } = job.data;
//
//     // Send reminder email
//     await sendEmail(
//         email,
//         "Appointment Reminder",
//         await appointmentFullDetailsEmail(userName, [], [], [], appointmentId, clientId)
//     );
// }, { connection: redisConnection });
//
// export { reminderWorker };
