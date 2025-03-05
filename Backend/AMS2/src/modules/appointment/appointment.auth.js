import { AppError } from "../../utils/AppError.js";
import serviceModel from "../../../DB/models/service.js";
import staffModel from "../../../DB/models/staff.js";

//TODO this file needs code refinement
export const authServices = () => {
    return async (req, res, next) => {
        const { slot } = req.body;  // The slots in the request body
        const { clientId } = req.params;

        if (!Array.isArray(slot) || slot.length === 0) {
            return next(new AppError("No slots provided", 400));
        }

        let missingStaffs = [];
        let missingServices = [];
        let unauthorizedStaffs = [];
        let unauthorizedServices = [];
        let validatedStaffsServices = [];

        for (const slotItem of slot) {
            const { subSlots } = slotItem;

            if (!Array.isArray(subSlots) || subSlots.length === 0) {
                return next(new AppError("No sub-slots provided in the slot", 400));
            }

            for (const subSlot of subSlots) {
                const { staffServices, startTime, endTime } = subSlot;

                if (!Array.isArray(staffServices) || staffServices.length === 0) {
                    return next(new AppError("No staff services provided for subSlot", 400));
                }

                for (const staffService of staffServices) {
                    const { staffId, services } = staffService;

                    // Validate staff
                    const staff = await staffModel.findById(staffId);
                    if (!staff) {
                        missingStaffs.push(staffId);
                        continue; // Skip further processing for this staff if not found
                    }

                    if (staff.clientId.toString() !== clientId) {
                        unauthorizedStaffs.push(staffId);
                        continue;
                    }

                    // Fetch the full service objects for the provided service IDs and convert to plain JS objects
                    const serviceObjects = await serviceModel.find({ _id: { $in: services } }).lean();

                    if (serviceObjects.length !== services.length) {
                        const foundServiceIds = serviceObjects.map(service => service._id.toString());
                        const staffMissingServices = services.filter(id => !foundServiceIds.includes(id));
                        missingServices.push({ staffId, missingServiceIds: staffMissingServices });
                    }

                    const unauthorized = serviceObjects.filter(service => service.clientId.toString() !== clientId);
                    if (unauthorized.length > 0) {
                        unauthorizedServices.push({ staffId, unauthorizedServiceIds: unauthorized.map(service => service._id.toString()) });
                    }

                    // Replace service IDs with service objects in the staffServices array
                    staffService.services = serviceObjects; // Replaces the service IDs with the full service objects

                    validatedStaffsServices.push({
                        staff,
                        services: serviceObjects // Now this is an array of plain JavaScript objects
                    });
                }

                // Validate time range (startTime and endTime)
                const parsedStartTime = new Date(startTime);
                const parsedEndTime = new Date(endTime);
                if (parsedStartTime >= parsedEndTime) {
                    return next(new AppError("Start time must be before end time", 400));
                }
            }
        }

        // If any errors, send appropriate response
        if (missingStaffs.length > 0) {
            return next(new AppError(`Missing staff: ${missingStaffs.join(', ')}`, 400));
        }

        if (missingServices.length > 0) {
            return next(new AppError(`Missing services: ${JSON.stringify(missingServices)}`, 400));
        }

        if (unauthorizedStaffs.length > 0) {
            return next(new AppError(`Unauthorized staff: ${unauthorizedStaffs.join(', ')}`, 400));
        }

        if (unauthorizedServices.length > 0) {
            return next(new AppError(`Unauthorized services: ${JSON.stringify(unauthorizedServices)}`, 400));
        }

        // Replace service IDs in the slot data itself with full service objects
        req.body.slot = slot.map(slotItem => {
            const newSlotItem = { ...slotItem };
            newSlotItem.subSlots = newSlotItem.subSlots.map(subSlot => {
                const newSubSlot = { ...subSlot };
                newSubSlot.staffServices = newSubSlot.staffServices.map(staffService => {
                    const newStaffService = { ...staffService };
                    newStaffService.services = staffService.services; // This is now an array of full service objects
                    return newStaffService;
                });
                return newSubSlot;
            });
            return newSlotItem;
        });
        req.staffsServices = validatedStaffsServices

        // If everything is valid, continue to the next middleware
        next();
    };
};


export const authSlots = () => {
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
