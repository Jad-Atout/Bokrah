import schedule from "node-schedule";
import scheduledJob from "../../../DB/models/scheduledJob.js";
import jobHandlers from "./jobHandler.js";

export const jobs = {};
async function scheduleJob(jobType, referenceId, scheduledTime, jobFunction) {

    const jobRecord = new scheduledJob({
        jobType,
        referenceId,
        scheduledTime,
    });
    await jobRecord.save();

    jobs[jobRecord._id] = schedule.scheduleJob(scheduledTime,async () => {
        try {
            await jobFunction();
        } catch (err) {
            console.error("Job execution failed:", err);
        } finally {
            await deleteJob(jobRecord._id);
        }
    });
}

export async function deleteJob(jobId) {
    try {
        const job = await scheduledJob.findByIdAndDelete(jobId);
        if (!job) {
            console.log(`No job found with ID: ${jobId}`);
        } else {
            jobs[jobId].cancel();
            delete jobs[jobId]
            console.log(`Job with ID ${jobId} deleted successfully.`);
        }
    } catch (err) {
        console.error('Error deleting job:', err);
    }
}

async function loadJobsFromDatabase() {
    console.log('🔄 Loading jobs from database...');

    const pendingJobs = await scheduledJob.find();

    for (const job of pendingJobs) {
        if (new Date(job.scheduledTime) > new Date()) {
            console.log(`✅ Restoring job: ${job.jobType} - ${job.referenceId}`);

            jobs[job._id] = schedule.scheduleJob(job.scheduledTime, async () => {
                console.log(`⏳ Executing job: ${job.jobType} - ${job.referenceId}`);

                const jobHandler = jobHandlers[job.jobType];
                if (jobHandler) {
                    await jobHandler(job);
                } else {
                    console.warn(`⚠️ No handler found for job type: ${job.jobType}`);
                }
                await deleteJob(job._id);
            });
        }
    }
    console.log('✅ All pending jobs loaded.');
}

export { scheduleJob, loadJobsFromDatabase };