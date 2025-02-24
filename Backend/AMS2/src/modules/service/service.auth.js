import serviceModel from '../../../DB/models/service.js'
import {AppError} from "../../utils/AppError.js";
//TODO we have to keep in mind the token must contain a client ID refers to the client himself
export const verifyOwnership =  ()=>{
    return async (req,res,next)=>{
        const {clientId} = req.authUser
        const {serviceId} = req.params
        const service = await serviceModel.findById(serviceId)
        if(!service){
            return next(new AppError("Service isn't found."))
        }
        if(service.clientId.toString === clientId){
            req.service = service
            return next()

        }
        return next(new AppError('Not authorized'))

    }
}