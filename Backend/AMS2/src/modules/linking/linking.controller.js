import serviceModel from "../../../DB/models/service.js";
import staffModel from "../../../DB/models/staff.js";
import { AppError } from "../../utils/AppError.js";




export const assignServiceStaff = async (req, res, next) => {
    try {
        const { clientId } = req.authUser;
        const { staffIds, serviceIds } = req.body;

        // Validate staff existence
        const staffs = await staffModel.find({ _id: { $in: staffIds } });
        const invalidStaffs = staffs.filter(staff => staff.clientId.toString() !== clientId);
        if (invalidStaffs.length > 0) {
            return next(new AppError("One or more staff members do not belong to this client.", 401));
        }

        if (serviceIds.length === 0) {
            // If serviceIds is empty, remove all assigned services from these staff
            await staffModel.updateMany(
                { _id: { $in: staffIds } },
                { $set: { services: [] } }
            );

            // Remove these staff from all services
            await serviceModel.updateMany(
                { staff: { $in: staffIds } },
                { $pull: { staff: { $in: staffIds } } }
            );

            return res.status(200).send("All services unassigned from staff.");
        }

        // Validate services existence
        const services = await serviceModel.find({ _id: { $in: serviceIds } });
        const invalidServices = services.filter(service => service.clientId.toString() !== clientId);
        if (invalidServices.length > 0) {
            return next(new AppError("One or more services do not belong to this client.", 401));
        }

        // Assign services to staff (overwrite existing)
        await staffModel.updateMany(
            { _id: { $in: staffIds } },
            { $set: { services: serviceIds } }
        );

        // Remove staff from services they should no longer be part of
        await serviceModel.updateMany(
            { _id: { $nin: serviceIds }, staff: { $in: staffIds } },
            { $pull: { staff: { $in: staffIds } } }
        );

        // Assign staff to the new services
        await serviceModel.updateMany(
            { _id: { $in: serviceIds } },
            { $addToSet: { staff: { $each: staffIds } } }
        );

        return res.status(200).send("Service assignments updated successfully.");
    } catch (error) {
        return next(error);
    }
};





export const assignServiceStaffMerge = async (req, res, next) => {
    try {
        // We'll assume auth middleware sets req.authUser with { clientId }
        const { clientId } = req.authUser;
        const { staffIds, serviceIds } = req.body;

        if (!Array.isArray(staffIds) || !Array.isArray(serviceIds)) {
            return next(new AppError("staffIds and serviceIds must be arrays.", 400));
        }

        // 1) Fetch the staff documents
        const staffs = await staffModel.find({ _id: { $in: staffIds } });
        if (staffs.length !== staffIds.length) {
            return next(new AppError("Some staff IDs were not found.", 404));
        }

        // Make sure all staff belong to the same client
        for (const staffDoc of staffs) {
            if (staffDoc.clientId.toString() !== clientId) {
                return next(
                    new AppError("One or more staff members do not belong to this client.", 403)
                );
            }
        }

        // 2) Fetch the service documents
        const services = await serviceModel.find({ _id: { $in: serviceIds } });
        if (services.length !== serviceIds.length) {
            return next(new AppError("Some service IDs were not found.", 404));
        }

        // Make sure all services belong to the same client
        for (const serviceDoc of services) {
            if (serviceDoc.clientId.toString() !== clientId) {
                return next(
                    new AppError("One or more services do not belong to this client.", 403)
                );
            }
        }

        // 3) Merge new services into each staff member's `services` field
        await staffModel.updateMany(
            { _id: { $in: staffIds } },
            { $addToSet: { services: { $each: serviceIds } } } // <--- merges new
        );

        // 4) Merge the staff into each service's `staff` field
        await serviceModel.updateMany(
            { _id: { $in: serviceIds } },
            { $addToSet: { staff: { $each: staffIds } } } // <--- merges new
        );

        return res.status(200).json({ message: "Services assigned (merged) successfully." });
    } catch (error) {
        return next(error);
    }
};



