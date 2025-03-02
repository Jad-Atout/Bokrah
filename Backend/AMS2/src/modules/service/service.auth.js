import serviceModel from '../../../DB/models/service.js'
import {AppError} from "../../utils/AppError.js";
export const verifyOwnership =  ()=>{
    return async (req,res,next)=>{
        const {clientId} = req.authUser
        const {serviceId} = req.params
        const service = await serviceModel.findById(serviceId)
        if(!service){
            return next(new AppError("Service isn't found."))
        }

        if(service.clientId?.toString() === clientId?.toString()){
            req.service = service
            return next()

        }
        return next(new AppError('Not authorized'))

    }
}