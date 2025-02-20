import Service from '../../../DB/models/service.js';
import ServicesStaff from '../../../DB/models/ServiceStaff.js';
import {AppError} from '../../../src/ults/AppError.js';
import jwt from "jsonwebtoken";


export const createService = async (req, res, next) => {
    try {
        console.log(req.headers);

        // Extract the token from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith(process.env.BEARERTOKEN)) {
            return next(new AppError("Unauthorized: No token provided", 401));
        }

        const token = authHeader.split("__")[1];

        // Verify and decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded Token:", decoded);

        // Ensure the user has a role and is a client
        if (!decoded.role || typeof decoded.role.client === "undefined" || !decoded.role.client) {
            return next(new AppError("Unauthorized: Only clients can create services", 403));
        }

        // Extract required fields
        const { serviceName, serviceDescription, price, duration, staffIds } = req.body;

        // Validate input
        if (!serviceName || !serviceDescription || !price || !duration) {
            return next(new AppError("All fields are required", 400));
        }

        // Create new service with authenticated client's ID
        const service = new Service({
            serviceName,
            serviceDescription,
            price,
            duration,
            clientId: decoded.id, // Assign the authenticated client's ID
        });

        await service.save();

        // Assign staff to service if provided
        if (staffIds && Array.isArray(staffIds) && staffIds.length > 0) {
            const staffServices = staffIds.map(staffId => ({
                staffId,
                serviceId: service._id
            }));

            await ServicesStaff.insertMany(staffServices);
        }

        res.status(201).json({ message: "Service created successfully", service });
    } catch (error) {
        console.error("Create Service Error:", error);
        next(new AppError("Internal Server Error", 500));
    }
};
export const getBusinessServices = async (req, res) => {
    try {
        const { clientId } = req.params;

        const services = await Service.find({ clientId })
            .populate({
                path: 'staffId',
                select: 'userId',
                populate: {
                    path: 'userId',
                    select: 'userName'
                }
            });

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