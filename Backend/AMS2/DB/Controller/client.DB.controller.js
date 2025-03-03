import userModel from '../../DB/models/user.js';
import {AppError} from "../../src/utils/AppError.js";
import roleModel from '../../DB/models/role.js';
import clientModel from "../models/client.js"
import googleModel from "../models/GoogleCalendar.js"
import serviceModel from "../models/Service.js"
import mongoose from "mongoose";
import staffModel from "../models/staff.js";
import appointmentModel from "../models/appointment.js";
import clientCustomer from "../models/ClientCustomer.js";
import getOrCreateSubCalendar from "../../src/utils/Google/Services/calendarManagement.js";
import {initializeOAuthClient} from "../../src/utils/Google/Services/refreshToken.js";

//TODO still needs Razan's testing
export const transCreateClient = async (clientData,userData,googleData) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        let user = await userModel.findOne({email: userData.email}).session(session);
        let role = await roleModel.findById(user.roleId).session(session);

        if (!role?.client) {
            if(!user){
                role = new roleModel({client: true,staff:true})
                await role.save({session})
                userData.roleId = role._id;
                user = new userModel(userData)
                await user.save({session})
                clientData.userId = user._id
            }else {
                role.client = true
                role.staff = true
                await role.save({session})
            }
            const client = new clientModel(clientData)
            await client.save({session})
            googleData.clientId = client._id

            const staff = new staffModel({userId:user._id,clientId:client._id})
            await staff.save({session})
            staff.calendarId = await getOrCreateSubCalendar(initializeOAuthClient(googleData.refreshToken),staff._id,user.userName)
            await staff.save({session})

            const google = new googleModel(googleData)
            await google.save({session})

            await session.commitTransaction();
            session.endSession();
            return {role, user, client, google,staff}
        }else{
            const role = await  roleModel.findById(user.roleId)
            const client = await  clientModel.findOne({userId:user._id})
            const staff = await staffModel.findOne({clientId: client._id})
            await googleModel.findOneAndUpdate({ clientId: client._id },googleData)
            return {role, user, client,staff}
        }

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return  new AppError(error.message || "Internal server error", 500);
    }
}

export const transUpdateClient = async (clientId, userData, clientData,staffData) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {

        const client = await clientModel.findById(clientId).session(session);
        if (!client) return  new AppError('Client not found', 404);

        await userModel.findByIdAndUpdate(client.userId, userData, { session, new: true });
        await clientModel.findByIdAndUpdate(clientId, clientData, { session, new: true });
        await staffModel.updateOne({userId:client.userId},staffData,{ session, new: true })
        await session.commitTransaction();
        session.endSession();
        return { message: "Client successfully updated" };
    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        return new AppError(err.message || 'Internal server error', 500);
    }
};


export const transDeleteClient = async (clientId) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {

        const client = await staffModel.findById(clientId).session(session);
        if (!client) return  new AppError('Client not found', 404);

        const user = await userModel.findById(client.userId).session(session);

        await roleModel.findByIdAndDelete(user.roleId, { session });
        await userModel.findByIdAndDelete(clientId.userId, { session });
        await serviceModel.deleteMany({ clientId: client._id },{ session });
        await staffModel.deleteMany({clientId: client._id},{ session })
        await googleModel.deleteOne({clientId: client._id},{ session })
        await appointmentModel.deleteMany({clientId: client._id},{ session })
        await clientCustomer.deleteMany({clientId: client._id},{ session })
        await clientModel.deleteOne(clientId, { session });

        await session.commitTransaction();
        session.endSession();

        return { message: "Deleted and related records successfully deleted" };
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        return  new AppError(err.message || 'Internal server error', 500);

    }
};