import serviceModel from "../../../DB/models/service.js";
import staffModel from "../../../DB/models/staff.js";
import { AppError } from "../../utils/AppError.js";

export const assignServiceStaff = async (req, res, next) => {
    try {
        const { clientId } = req.authUser;
        const { staffIds, serviceIds } = req.body;

        const [services, staffs] = await Promise.all([
            serviceModel.find({ _id: { $in: serviceIds } }),
            staffModel.find({ _id: { $in: staffIds } }),
        ]);

        const invalidServices = services.filter(
            (service) => service.clientId.toString() !== clientId
        );
        if (invalidServices.length > 0) {
            return next(
                new AppError("One or more services do not belong to this client.", 401)
            );
        }

        const invalidStaffs = staffs.filter(
            (staff) => staff.clientId.toString() !== clientId
        );
        if (invalidStaffs.length > 0) {
            return next(
                new AppError("One or more staff members do not belong to this client.", 401)
            );
        }

        await staffModel.updateMany(
            { _id: { $in: staffIds } },
            { $set: { services: serviceIds } }
        );


        await serviceModel.updateMany(
            { _id: { $nin: serviceIds }, staff: { $in: staffIds } },
            { $pull: { staff: { $in: staffIds } } }
        );


        await serviceModel.updateMany(
            { _id: { $in: serviceIds } },
            { $addToSet: { staff: { $each: staffIds } } }
        );

        return res.status(200).send("success");
    } catch (error) {
        return next(error);
    }
};
