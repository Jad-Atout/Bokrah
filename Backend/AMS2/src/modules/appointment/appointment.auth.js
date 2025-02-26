import {AppError} from "../../utils/AppError.js";
import serviceModel from "../../../DB/models/service.js"
import staffModel from "../../../DB/models/staff.js"


/*
✅ Validate if all staff exist
✅ Validate if all services exist for each staff
✅ Validate if all staff and services belong to the provided clientId
✅ Replace staff IDs with full staff objects
✅ Replace service IDs with full service objects
✅ Return an error if any staff, service, or ownership is incorrect
*/
export const authServices = () => {
    return async (req, res, next) => {
        const { staffsServices } = req.body;
        const { clientId } = req.params;

        if (!Array.isArray(staffsServices) || staffsServices.length === 0) {
            return next(new AppError("No staff or services provided", 400));
        }

        let missingStaffs = [];
        let missingServices = [];
        let unauthorizedStaffs = [];
        let unauthorizedServices = [];
        let validatedStaffsServices = [];

        for (const staffService of staffsServices) {
            const { staffId, services } = staffService;

            const staff = await staffModel.findById(staffId);
            if (!staff) {
                missingStaffs.push(staffId);
                continue; // Skip further processing for this staff if not found
            }

            if (staff.clientId.toString() !== clientId) {
                unauthorizedStaffs.push(staffId);
                continue;
            }

            const serviceIds = services.map(service => service.serviceId);
            const foundServices = await serviceModel.find({ _id: { $in: serviceIds } });

            if (foundServices.length !== serviceIds.length) {
                const foundServiceIds = foundServices.map(service => service._id.toString());
                const staffMissingServices = serviceIds.filter(id => !foundServiceIds.includes(id));
                missingServices.push({ staffId, missingServiceIds: staffMissingServices });
            }

            const unauthorized = foundServices.filter(service => service.clientId.toString() !== clientId);
            if (unauthorized.length > 0) {
                unauthorizedServices.push({ staffId, unauthorizedServiceIds: unauthorized.map(service => service._id.toString()) });
            }

            validatedStaffsServices.push({ staff, services: foundServices });
        }

        if (missingStaffs.length > 0 || missingServices.length > 0 || unauthorizedStaffs.length > 0 || unauthorizedServices.length > 0) {
            return res.status(400).json({
                message: "Some staff or services were not found or unauthorized.",
                details: {
                    missingStaffs,
                    missingServices,
                    unauthorizedStaffs,
                    unauthorizedServices
                }
            });


        }
        req.staffsServices = validatedStaffsServices;
        return next();
    };
};