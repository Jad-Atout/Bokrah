import userModel from '../../DB/models/user.js';
import {AppError} from "../../src/utils/AppError.js";
import roleModel from '../../DB/models/role.js';
import clientModel from "../models/client.js"
import googleModel from "../models/GoogleCalendar.js"
import serviceModel from "../models/service.js"
import mongoose from "mongoose";
import staffModel from "../models/staff.js";
import appointmentModel from "../models/appointment.js";
import clientCustomer from "../models/ClientCustomer.js";
import getOrCreateSubCalendar from "../../src/utils/Google/Services/calendarManagement.js";
import {initializeOAuthClient} from "../../src/utils/Google/Services/refreshToken.js";
import UserClient from "../models/ClientCustomer.js";
import websiteModel from "../models/website.js";

export const transCreateClient = async (clientData, userData, googleData) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = await userModel.create([userData], { session });
        const client = await clientModel.create([{ userId: user[0]._id, ...clientData }], { session });
        const website = await websiteModel.create([{ clientId: client[0]._id, ...clientData }], { session });

        await session.commitTransaction();
        return { client: client[0], user: user[0], website: website[0] };
    } catch (error) {
        await session.abortTransaction();
        throw new AppError(error.message, 500);
    } finally {
        session.endSession();
    }
};

export const transUpdateClient = async (clientId, userData, clientData, staffData, websiteData) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const client = await clientModel.findById(clientId).session(session);
        if (!client) {
            throw new AppError("Client not found", 404);
        }

        const user = await userModel.findByIdAndUpdate(
            client.userId,
            { $set: userData },
            { new: true, session }
        );

        const updatedClient = await clientModel.findByIdAndUpdate(
            clientId,
            { $set: clientData },
            { new: true, session }
        );

        let website = await websiteModel.findOne({ clientId }).session(session);
        if (!website) {
            website = await websiteModel.create([{ clientId, ...websiteData }], { session });
        } else {
            website = await websiteModel.findByIdAndUpdate(
                website._id,
                { $set: websiteData },
                { new: true, session }
            );
        }
console.log("website",website)
        await session.commitTransaction();
        return { client: updatedClient, user, website };
    } catch (error) {
        await session.abortTransaction();
        throw new AppError(error.message, 500);
    } finally {
        session.endSession();
    }
};

export const transDeleteClient = async (clientId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const client = await clientModel.findById(clientId).session(session);
        if (!client) {
            throw new AppError("Client not found", 404);
        }

        await userModel.findByIdAndDelete(client.userId).session(session);
        await websiteModel.deleteMany({ clientId }).session(session);
        await clientModel.findByIdAndDelete(clientId).session(session);

        await session.commitTransaction();
        return { message: "Client deleted successfully" };
    } catch (error) {
        await session.abortTransaction();
        throw new AppError(error.message, 500);
    } finally {
        session.endSession();
    }
};

export async function getAllClients() {
    try {
        const clients = await clientModel.find()
            .populate({
                path: 'userId',
            });

        const clientData = await Promise.all(
            clients
                .filter(client => client.userId) // Filter out clients where userId is null
                .map(async (client) => {
                    const servicesCount = await serviceModel.countDocuments({ clients: client._id });
                    const staffCount = await staffModel.countDocuments({ clients: client._id });
                    const customerCount = await UserClient.countDocuments({ clientId: client._id });

                    return {
                        id: client._id,
                        name: client.userId?.userName || '',
                        email: client.userId?.email || '',
                        phone: client.userId?.phoneNumber || '',
                        services: servicesCount,
                        staff: staffCount,
                        customers: customerCount
                    };
                })
        );

        return {
            totalClients: clientData.length,
            clients: clientData
        };
    } catch (error) {
        console.error('Error retrieving clients:', error);
        throw new Error('Failed to fetch clients');
    }
}
