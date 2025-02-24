import userModel from '../../DB/models/user.js';
import {AppError} from "../../src/utils/AppError.js";
import roleModel from '../../DB/models/role.js';
import clientModel from "../models/client.js"
import googleModel from "../models/GoogleCalendar.js"

import mongoose from "mongoose";


export const transCreateClient = async (clientData,userData,googleData) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await userModel.findOne({email: userData.email}).session(session);
        if (!user) {
            const role = new roleModel({client: true})
            await role.save({session})
            userData.roleId = role._id;
            const newUser = new userModel(userData)
            await newUser.save({session})
            clientData.userId = newUser._id

            const client = new clientModel(clientData)
            await client.save({session})
            googleData.clientId = client._id

            const google = new googleModel(googleData)
            await google.save({session})

            await session.commitTransaction();
            session.endSession();
            return {role, user:newUser, client, google}
        }else{
            const role = await  roleModel.findById(user.roleId)
            const client = await  clientModel.findOne({userId:user._id})
            return {role, user, client}
        }

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return  new AppError(error.message || "Internal server error", 500);
    }
}