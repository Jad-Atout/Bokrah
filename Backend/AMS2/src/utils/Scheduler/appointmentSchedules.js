// import { Queue } from "bullmq";
// import staffModel from "../../../DB/models/staff.js";
// import deleteEvent from "../Google/events/deleteEvent.js";
// import { redisConnection } from "./scheduler.js";
// import { deleteJobFromQueue } from "./scheduler.js";
// import appointmentModel from "../../../DB/models/appointment.js";
//
// // Queue for sub-appointment end jobs
// const subAppointmentQueue = new Queue("subAppointmentQueue", { connection: redisConnection });
//
// // Schedule sub-appointments
// export async function scheduleSubAppointments(appointment, auth) {
//     for (const subAppointment of appointment.subAppointments) {
//         const { calendarId } = await staffModel.findById(subAppointment.staffId);
//
//         await subAppointmentQueue.add("subAppointmentEnd", {
//             subAppointmentId: subAppointment._id,
//             calendarId,
//             eventId: subAppointment.eventId,
//             appointmentId: appointment._id,
//         }, { delay: new Date(subAppointment.endTime) - Date.now() });
//     }
// }
//
// // Worker to handle sub-appointment end jobs
// const subAppointmentWorker = new Worker("subAppointmentQueue", async (job) => {
//     const { calendarId, subAppointmentId, eventId, appointmentId } = job.data;
//
//     // Delete the event from Google Calendar
//     await deleteEvent(calendarId, eventId);
//
//     // Mark sub-appointment as completed
//     const subAppointment = await subAppointmentModel.findById(subAppointmentId);
//     subAppointment.status = "completed";
//     await subAppointment.save();
//
//     // Check if all sub-appointments are completed and update appointment status
//     const appointment = await appointmentModel.findById(appointmentId);
//     const isLastSubAppointment = appointment.subAppointments.every(sub => sub.status === "completed");
//     if (isLastSubAppointment) {
//         appointment.status = "completed";
//         await appointment.save();
//         console.log(`✅ Appointment ${appointment._id} is now completed.`);
//     }
// }, { connection: redisConnection });
//
// // Cancel scheduled sub-appointments
// export async function cancelScheduledSubAppointments(appointmentId) {
//     const appointment = await appointmentModel.findById(appointmentId);
//     for (const subAppointment of appointment.subAppointments) {
//         const jobs = await scheduleJob.find({ referenceId: subAppointment._id });
//         for (const job of jobs) {
//             await deleteJobFromQueue(job._id);
//         }
//     }
// }
