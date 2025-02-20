import Service from '../../../DB/models/service.js';
import ServicesStaff from '../../../DB/models/ServiceStaff.js';
import {AppError} from '../../utils/AppError.js';
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


export const createService = async (req, res, next) => {
    try {
        const user = req.authUser
        console.log(user)
        if (!user.role['client']) {
            return next(new AppError("Unauthorized: Only clients can create services", 403));
        }

        const { serviceName, serviceDescription, price, duration, staffIds } = req.body;


        const service = new Service({
            serviceName,
            serviceDescription,
            price,
            duration,
            clientId: user.clientId,
        });

        await service.save();



        res.status(201).json({ message: "Service created successfully", service });
    } catch (error) {
        console.error("Create Service Error:", error);
        next(new AppError("Internal Server Error", 500));
    }
};
export const getClientServices = async (req, res) => {
    try {
        const { clientId } = req.params;
        console.log(clientId)
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

        console.log(services);


        res.json(services);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const { staffIds, ...serviceData } = req.body;

        const service = await Service.findByIdAndUpdate(
            id,
            serviceData,
            { new: true }
        );

        if (staffIds) {
            // Remove existing staff assignments
            await ServicesStaff.deleteMany({ serviceId: id });

            // Create new staff assignments
            if (staffIds.length > 0) {
                const staffServices = staffIds.map(staffId => ({
                    staffId,
                    serviceId: id
                }));

                await ServicesStaff.insertMany(staffServices);
            }
        }

        res.json(service);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;

        // Remove staff assignments
        await ServicesStaff.deleteMany({ serviceId: id });

        // Delete service
        await Service.findByIdAndDelete(id);

        res.json({ message: "Service deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};