import mongoose from 'mongoose';
import {loadJobsFromDatabase} from "../src/utils/Scheduler/scheduler.js";

export const connectDB = async ()=>{

    return await mongoose.connect("mongodb+srv://razan:123@cluster0.3ahbf.mongodb.net/Bokrah1")
        .then( async ()=>{
            console.log("✅ Connected to MongoDB");
            await loadJobsFromDatabase();
            console.log("🔄 Reload scheduled jobs on startup");


        } ).catch( (err)=>{
            console.log(`error to connect db ${err}`)
        })
}


