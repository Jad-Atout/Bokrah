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
import Availability from "../models/availability.js";
import { generateWebsiteUrl } from '../../src/utils/websiteUtils.js';

export const transCreateClient = async (clientData, userData, googleData) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let user = await userModel.findOne({ email: userData.email }).session(session);
        let role = (user && user.roleId) ? await roleModel.findById(user.roleId).session(session) : null;
        let website

        if (role?.staff && !role?.client) {
            return { appError: new AppError("user is a staff and can't become a client") };
        }

        let newClient = false;
        let client, staff;

        if (!role?.client) {
            newClient = true;

            // Create role if not exists
            if (!role) {
                role = new roleModel({ client: true, staff: true });
                await role.save({ session });
            } else {
                role.client = true;
                role.staff = true;
                await role.save({ session });
            }

            // Create or update user
            if (!user) {
                userData.roleId = role._id;
                user = new userModel(userData);
                await user.save({ session });
            } else {
                user.roleId = role._id;
                await user.save({ session });
            }

            // Create client
            clientData.userId = user._id;
            client = new clientModel(clientData);
            await client.save({ session });

            // Create staff
            staff = new staffModel({ userId: user._id, clientId: client._id });
            await staff.save({ session });

            // Create sub-calendar
            staff.calendarId = await getOrCreateSubCalendar(
                initializeOAuthClient(googleData.refreshToken),
                staff._id,
                user.userName
            );
            await staff.save({ session });

            // Save google data
            googleData.clientId = client._id;
            const google = new googleModel(googleData);
            await google.save({ session });

            // Create default availability
            const availability =new Availability();
            await availability.save({session})

            website = new websiteModel({ clientId: client._id, ...clientData,availabilityId:availability._id });
            await website.save({ session });

            const { fullUrl } = generateWebsiteUrl(client, userData.userName);
            client.customWebsiteName = userData.userName;
            client.website = fullUrl;
            await client.save({ session });


        } else {
            // Existing client
            client = await clientModel.findOne({ userId: user._id }).session(session);
            staff = await staffModel.findOne({ clientId: client._id }).session(session);
            website = websiteModel.findOne({clientId: client._id}).session(session);
            // Update Google data if needed
            await googleModel.findOneAndUpdate({ clientId: client._id }, googleData).session(session);
        }

        await session.commitTransaction();
        return { role, user, client, staff, website, newClient };
    } catch (error) {
        await session.abortTransaction();
        if (session.inTransaction()) {
                    await session.abortTransaction();
                   }
        return { appError: new AppError(error.message || "Internal server error", 500) };
    } finally {
        session.endSession();
}
};


export const transUpdateClient = async (clientId, userData, clientData, staffData, websiteData) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const client = await clientModel.findById(clientId).session(session);
        if (!client) throw new AppError("Client not found", 404);

        const updatedUser = await userModel.findByIdAndUpdate(
            client.userId,
            { $set: userData },
            { session, new: true }
        );

        const updatedClient = await clientModel.findByIdAndUpdate(
            clientId,
            { $set: clientData },
            { session, new: true }
        );

        await staffModel.updateOne(
            { userId: client.userId },
            { $set: staffData },
            { session }
        );

        // Check if website exists; if not, create it
        let website = await websiteModel.findOne({ clientId }).session(session);
        if (!website) {
            const created = await websiteModel.create([{ clientId, ...websiteData }], { session });
            website = created[0];

            // Optionally generate website URL and save it to the client
            const { fullUrl } = generateWebsiteUrl(updatedClient, updatedUser.userName);
            updatedClient.customWebsiteName = updatedUser.userName;
            updatedClient.website = fullUrl;
            await updatedClient.save({ session });
        } else {
            website = await websiteModel.findByIdAndUpdate(
                website._id,
                { $set: websiteData },
                { session, new: true }
            );
        }

        await session.commitTransaction();
        return {
            message: "Client successfully updated",
            client: updatedClient,
            user: updatedUser,
            website
        };
    } catch (error) {
        await session.abortTransaction();
        return new AppError(error.message || "Internal server error", 500);
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
