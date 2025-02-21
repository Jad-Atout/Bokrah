import Service from '../../../DB/models/service.js';
import ServicesStaff from '../../../DB/models/ServiceStaff.js';
import {AppError} from '../../utils/AppError.js';
import mongoose from "mongoose";


export const createService = async (req, res, next) => {
        const user = req.authUser
        const { serviceName, serviceDescription, price, duration,} = req.body;

    if (!user.role['client']) {
            return next(new AppError("Unauthorized: Only clients can create services", 403));
        }

        const service = new Service({
            serviceName,
            serviceDescription,
            price,
            duration,
            clientId: user.clientId,
        });
        await service.save();
        res.status(201).json({ message: "Service created successfully", service });
};

export const getClientServices = async (req, res) => {
// TODO: still need to check the staff returning functionality
        const { clientId } = req.params;
        const services = await Service.aggregate([
            {
                $match: { clientId: new mongoose.Types.ObjectId(clientId) } // Find services for this client
            },
            {
                $lookup: {
                    from: "users", // Assuming clients are stored in the User collection
                    localField: "clientId",
                    foreignField: "_id",
                    as: "client"
                }
            },
            {
                $unwind: { path: "$client", preserveNullAndEmptyArrays: true }
            },
            {
                $lookup: {
                    from: "servicesstaffs", // Join with ServicesStaff
                    localField: "_id",
                    foreignField: "serviceId",
                    as: "staffServices"
                }
            },
            {
                $lookup: {
                    from: "staffs", // Get staff details
                    localField: "staffServices.staffId",
                    foreignField: "_id",
                    as: "staff"
                }
            },
            {
                $lookup: {
                    from: "users", // Get staff names
                    localField: "staff.userId",
                    foreignField: "_id",
                    as: "staffUsers"
                }
            },
            {
                $project: {
                    serviceName: 1,
                    serviceDescription: 1,
                    price: 1,
                    duration: 1,
                    clientName: "$client.userName", // Extract client name
                    staffNames: "$staffUsers.userName" // Extract staff names
                }
            }
        ]);

        res.json({message:"success",services});
};

export const updateService = async (req, res) => {
        const { id } = req.params;
        const {...serviceData } = req.body;

        const service = await Service.findByIdAndUpdate(
            id,
            serviceData,
            { new: true }
        );
        res.json({  message: "Service updated successfully.", service });
};

export const deleteService = async (req, res) => {
        const { id } = req.params;
        await ServicesStaff.deleteMany({ serviceId: id });
        await Service.findByIdAndDelete(id);
        res.json({ message: "Service deleted successfully." });
};