import {appointmentModel, serviceModel} from "../../../DB/model/relations.js";
import {AppError} from "../../utils/AppError.js"; // Adjust path based on your structure

export const authServices = ()=>{
 return async (req, res, next) =>{
        const  serviceIds  = req?.body.serviceIds; // Extract service IDs from the request body
        if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
         return next(new AppError('No service id provided',400));
        }
        const services = await serviceModel.findAll({
            where: { id: serviceIds }
        });
        const foundServiceIds = services.map(service => service.id);
        const missingServiceIds = serviceIds.filter(id => !foundServiceIds.includes(id));
        if (missingServiceIds.length > 0) {
            return  next(new AppError({message: "Some services were not found.",missingServiceIds},400))
        }
        req.services = services;
        return next();
};
}
export const checkAppointmentExistence = async () => {
    return async (req, res, next) =>{
    const {appointmentId} = req.params;

    const appointment = await appointmentModel.findByPk(
          appointmentId,
    );

    if (!appointment) {
        return next(new AppError("Appointment not found.", 404));
    }

    req.appointment = appointment;
    return next();
}}


