import {serviceModel} from "../../../DB/model/relations.js";
import {AppError} from "../../utils/AppError.js";
// we have a bug in updateService the value of duration and price can be both integer and string
export const createService = async (req, res,next) => {
    const {serviceName,serviceDescription,price,duration} = req.body;
    const clientId = req.authUser.id;
    const serviceData = {clientId,serviceName,duration}
    if(price) serviceData.price = price;
    if(serviceDescription) serviceData.serviceDescription = serviceDescription;
    const service = await serviceModel.create(serviceData)
    return res.status(201).json({"message": "Service created successfully.",service});
}
export const deleteService = async (req, res,next) => {
    const serviceId = req.params.id;
    const service = await serviceModel.findByPk(serviceId)
    if(!service) return  next( new AppError("Service not found!",401));
    await service.destroy()
    return res.status(200).json({"message": "Service deleted successfully.",service});
}
export const getClientServices = async (req,res,next) => {
    const id = req.params.id;
    const services = await serviceModel.findAll({
        where:{
            clientId:id
        }
    })
    if(services.length===0) return  next(new AppError("Services not found!",401));
    return res.status(200).json({"message": "success",services})
}
export const updateService = async (req,res,next) => {
    const { id } = req.params;
    const { serviceName, serviceDescription, price, duration } = req.body;  // Extract service data
    const serviceData = Object.fromEntries(
        Object.entries({ serviceName, serviceDescription, price, duration })
            .filter(([_, value]) => value !== undefined)
    );
    if(!Object.keys(serviceData).length) return next(new AppError("Failed to update service no data's provided.",401));
    const service = await serviceModel.findByPk(id)
    if(!service) return  next(new AppError("Service not found!",401));
    const updatedService = await service.update(serviceData)
    return res.status(200).json({"message": "Successfully updated",updatedService});


}