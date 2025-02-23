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
    const { clientId } = req.params;

    const services = await Service.aggregate([
        {
            $match: { clientId: new mongoose.Types.ObjectId(clientId) }
        },
        {
            $lookup: {
                from: "clients",
                localField: "clientId",
                foreignField: "_id",
                as: "client"
            }
        },
        { $unwind: { path: "$client", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "users",
                localField: "client.userId",
                foreignField: "_id",
                as: "clientUser"
            }
        },
        { $unwind: { path: "$clientUser", preserveNullAndEmptyArrays: true } },

        // Lookup staff details from "staffs" collection
        {
            $lookup: {
                from: "staffs",
                let: { serviceId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $in: ["$$serviceId", { $ifNull: ["$services", []] }]
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "userId",
                            foreignField: "_id",
                            as: "staffUser"
                        }
                    },
                    { $unwind: { path: "$staffUser", preserveNullAndEmptyArrays: true } },
                    {
                        $project: {
                            _id: 1, // Keep staff ID
                            name: "$staffUser.userName",
                            email: "$staffUser.email",
                            phoneNumber: "$staffUser.phoneNumber"
                        }
                    }
                ],
                as: "staff"
            }
        },

        {
            $project: {
                _id: 1,
                serviceName: 1,
                serviceDescription: 1,
                price: 1,
                duration: 1,
                clientBusinessName: "$client.businessName",
                clientIndustry: "$client.industry",
                clientName: "$clientUser.userName",
                staff: 1 // Ensure full staff details are included
            }
        }
    ]);

    return res.json({ message: "success", services });
};


<<<<<<< HEAD
const formatService = (data) => {
    return data.map(service => ({
        _id: service._id,
        serviceName: service.serviceName,
        serviceDescription: service.serviceDescription,
        price: service.price,
        duration: service.duration,
        client: {
            userName: service.clientId.userId.userName,  // Extract userName
            businessName: service.clientId.businessName,
            industry: service.clientId.industry
        },
        staff: service.staff.map(staffMember => ({
            _id: staffMember._id,
            roleDescription: staffMember.roleDescription,
            userName: staffMember.userId.userName,
            email: staffMember.userId.email,
            phoneNumber: staffMember.userId.phoneNumber

        }))
    }));
}

export const getClientServices = async (req, res) => {
    const {clientId} = req.params;
    const services = await Service.find({ clientId: clientId })
        .populate({
            path: "staff",
            select: "roleDescription",
            populate: {
                path: "userId",
                model: "User",
                select: "userName email phoneNumber"
            }
        })
        .populate({
            path: "clientId",
            select: "businessName industry",
            populate: {
                path: "userId",
                model: "User",
                select: "userName"
            }
        })
        .exec();

    const formattedServices = formatService(services)
    return res.json({message: "success", formattedServices});
}
=======
>>>>>>> 59aa4d9dea3a06ad168c6944b425a9f3e13b509d

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

