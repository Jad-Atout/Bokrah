import {AppError} from "../utils/AppError.js";

export const validationHandler = (Schema)=>{
    return (req, res, next) => {
        const inputData = {...req.body,...req.params}
        const {error} = Schema.validate(inputData,{abortEarly: false});
        if(error){
            return next(new AppError(error.details.map(err => err.message).join(', '), 400));
        }
        return next()
    }

}
