import {AppError} from "../../src/utils/AppError.js";
import mongoose from "mongoose";
import staffModel from "../models/staff.js";

export const transDeleteService = async (service) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const staffIds = service.staff;
        await staffModel.updateMany(
            { _id: { $in: staffIds } },
            { $pull: { services: service._id } },
            { session }
        );
        const deletedService = await service.deleteOne({ session });

        await session.commitTransaction();
        session.endSession();

        return {deletedService,appError:null};
    }catch (err){

        await session.abortTransaction();
        session.endSession();

        return {deletedService:null,appError:new AppError(err.message || 'Internal server error', 500)}
    }
}

export const transUpdateService = async (service,serviceData) => {

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        Object.assign(service, serviceData);
        await service.save({ session });

        await session.commitTransaction();
        session.endSession();

        return {updatedService:service,appError:null};
    }catch (err){

        await session.abortTransaction();
        session.endSession();

        return {updatedService:null,appError:new AppError(err.message || 'Internal server error', 500)}
    }
}
