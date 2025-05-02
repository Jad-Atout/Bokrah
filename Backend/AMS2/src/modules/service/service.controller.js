import serviceModel from '../../../DB/models/service.js';
import {AppError} from '../../utils/AppError.js';
import {transDeleteService, transUpdateService} from "../../../DB/Controller/service.DB.controller.js";
export const createService = async (req, res, next) => {
        const user = req.authUser
        const { serviceName, serviceDescription, price,serviceColor, duration,bufferTime} = req.body;

    if (!user.role['client']) {
            return next(new AppError("Unauthorized: Only clients can create services", 403));
        }

        const service = new serviceModel({
            serviceName,
            serviceDescription,
            price,
            duration,
            serviceColor,
            clientId: user.clientId,
            bufferTime
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
        visible:service.visible,
        bufferTime:service.bufferTime,
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

        })),
        serviceColor:service.serviceColor,
    }));
}

export const getClientServices = async (req, res) => {
    const {clientId} = req.params;
    const services = await serviceModel.find({ clientId: clientId })
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

export const setVisibility = async (req, res) => {
       const service = req.service;
       const {visible} = req.body;
       service.visible = visible;
       service.save()
       return res.status(200).json({message: "Service visibility updated successfully", visible});

}
export const updateService = async (req, res,next) => {
        const service = req.service
        const {...serviceData } = req.body;
        const {updatedService,appError} = await transUpdateService(service,serviceData);
        if(appError)return next(appError)
        let data = []
         const updatedServiceData=   await serviceModel.findById(updatedService._id)
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
        data.push(updatedServiceData);


        return res.json({  message: "Service updated successfully.", service:formatService(data) });
};

export const deleteService = async (req, res, next) => {
        const service = req.service
        const {deletedService,appError} = await transDeleteService(service);
        if(appError) return next(appError);
        return res.json({ message: "Service deleted successfully.",deletedService });
};

