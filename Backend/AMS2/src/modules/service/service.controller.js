import Service from '../../../DB/models/service.js';
import {AppError} from '../../utils/AppError.js';
import {transDeleteService, transUpdateService} from "../../../DB/Controller/service.DB.controller.js";

//Todo revision the return value of delete and update if it needs to contain staff data
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
       return res.status(201).json({ message: "Service created successfully", service });
};



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


export const updateService = async (req, res,next) => {
        const service = req.service
        const {...serviceData } = req.body;
        const {updatedService,appError} = await transUpdateService(service,serviceData);
        if(appError)return next(appError)
        return res.json({  message: "Service updated successfully.", updatedService });
};

export const deleteService = async (req, res, next) => {
        const service = req.service
        const {deletedService,appError} = await transDeleteService(service);
        if(appError) return next(appError);
        return res.json({ message: "Service deleted successfully.",deletedService });
};

