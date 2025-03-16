// import { Queue, Worker } from "bullmq";
// import { createClient } from "redis";
// import scheduledJob from "../../../DB/models/scheduledJob.js";
//
// // Redis connection setup
// const redisConnection = {
//     connection: createClient({ host: "localhost", port: 6379 }),
// };
//
// // Job Queue
// export const jobQueue = new Queue("jobQueue", redisConnection);
//
// // Job Worker
// const jobWorker = new Worker("jobQueue", async (job) => {
//     console.log(`Executing job: ${job.name} for ${job.data.referenceId}`);
//
//     if (job.name === "appointmentReminder") {
//         await handleAppointmentReminder(job);
//     } else if (job.name === "subAppointmentEnd") {
//         await handleAppointmentStatus(job);
//     }
// }, redisConnection);
//
// // Delete job from queue
// export async function deleteJobFromQueue(jobId) {
//     await jobQueue.remove(jobId);
//     console.log(`Job ${jobId} deleted from queue.`);
// }
//
// // Load pending jobs from the database and schedule them
// export async function loadJobsFromDatabase() {
//     console.log('🔄 Loading jobs from database...');
//
//     const pendingJobs = await scheduledJob.find({ status: "pending" });
//
//     for (const job of pendingJobs) {
//         if (new Date(job.scheduledTime) > new Date()) {
//             console.log(`✅ Restoring job: ${job.jobType} - ${job.referenceId}`);
//
//             await scheduleJob(job.jobType, job.referenceId, job.scheduledTime, async () => {
//                 console.log(`⏳ Executing job: ${job.jobType} - ${job.referenceId}`);
//
//                 const jobHandler = jobHandlers[job.jobType];
//                 if (jobHandler) {
//                     await jobHandler(job);  // Execute the handler function
//                 } else {
//                     console.warn(`⚠️ No handler found for job type: ${job.jobType}`);
//                 }
//             });
//         }
//     }
//     console.log('✅ All pending jobs loaded.');
// }
//
// export { redisConnection };
