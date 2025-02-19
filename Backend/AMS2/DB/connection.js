import mongoose from 'mongoose';

export const connectDB = async ()=>{

    return await mongoose.connect("mongodb+srv://razan:123@cluster0.3ahbf.mongodb.net/Bokrah1")
        .then( ()=>{
            console.log("connect db");
        } ).catch( (err)=>{
            console.log(`error to connect db ${err}`)
        })
}


