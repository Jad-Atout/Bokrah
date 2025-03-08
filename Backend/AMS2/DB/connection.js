import mongoose from 'mongoose';
import {reloadScheduledReminders} from "../src/utils/scheduler.js";

export const connectDB = async ()=>{

    return await mongoose.connect("mongodb+srv://razan:123@cluster0.3ahbf.mongodb.net/Bokrah1")
        .then( async ()=>{
            console.log("✅ Connected to MongoDB");
            await reloadScheduledReminders();
            console.log("🔄 Reload scheduled reminders on startup db");


        } ).catch( (err)=>{
            console.log(`error to connect db ${err}`)
        })
}


