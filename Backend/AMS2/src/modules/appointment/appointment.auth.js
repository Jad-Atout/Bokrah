import { AppError } from "../../utils/AppError.js";
import serviceModel from "../../../DB/models/service.js";
import staffModel from "../../../DB/models/staff.js";
import appointmentModel from "../../../DB/models/appointment.js";

//TODO this file needs code refinement

async function validateStaffServices({
                                         staffId,
                                         serviceIds,
                                         clientId,
                                         missingStaffs,
                                         unauthorizedStaffs,
                                         missingServices,
                                         unauthorizedServices,
                                         lean = false,
                                     }) {
    // Validate staff
    const staff = await staffModel.findById(staffId);
    if (!staff) {
        missingStaffs.push(staffId);
        return; // stop here for this staff
    }

    // Check staff authorization
    if (staff.clientId.toString() !== clientId) {
        unauthorizedStaffs.push(staffId);
        return;
    }

    // Fetch the relevant services (lean or not, depending on the caller’s needs)
    const query = serviceModel.find({ _id: { $in: serviceIds } });
    const serviceObjects = lean ? await query.lean() : await query;

    // Check if any services are missing
    if (serviceObjects.length !== serviceIds.length) {
        const foundServiceIds = serviceObjects.map((s) => s._id.toString());
        const staffMissing = serviceIds.filter((id) => !foundServiceIds.includes(id));
        missingServices.push({ staffId, missingServiceIds: staffMissing });
    }

    // Check for unauthorized services
    const unauthorized = serviceObjects.filter((s) => s.clientId.toString() !== clientId);
    if (unauthorized.length > 0) {
        unauthorizedServices.push({
            staffId,
            unauthorizedServiceIds: unauthorized.map((s) => s._id.toString()),
        });
    }

    return { staff, serviceObjects };
}

export const authServices = () => {
    return async (req, res, next) => {
        const { slot } = req.body;
        const { clientId } = req.params;

        // Check if slot is an object (not an array)
        if (typeof slot !== 'object' || !slot || Object.keys(slot).length === 0) {
            return next(new AppError("No slots provided", 400));
        }

        // Collect possible errors in these arrays
        let missingStaffs = [];
        let missingServices = [];
        let unauthorizedStaffs = [];
        let unauthorizedServices = [];

        // Keep track of fully validated { staff, services } objects
        let validatedStaffsServices = [];

        // Handle the slot (now an object)
        const { subSlots } = slot;

        // If no subSlots or subSlots is not an array
        if (!Array.isArray(subSlots) || subSlots.length === 0) {
            return next(new AppError("No sub-slots provided in the slot", 400));
        }

        // Validate each sub-slot
        for (const subSlot of subSlots) {
            const { staffServices, startTime, endTime } = subSlot;
            if (!Array.isArray(staffServices) || staffServices.length === 0) {
                return next(new AppError("No staff services provided for subSlot", 400));
            }

            // Validate time range
            const parsedStartTime = new Date(startTime);
            const parsedEndTime = new Date(endTime);
            if (parsedStartTime >= parsedEndTime) {
                return next(new AppError("Start time must be before end time", 400));
            }

            // Validate each staff-service group
            for (const staffService of staffServices) {
                const { staffId, services } = staffService;

                // Use the helper to validate staff & services
                const validationResult = await validateStaffServices({
                    staffId,
                    serviceIds: services, // array of service IDs
                    clientId,
                    missingStaffs,
                    unauthorizedStaffs,
                    missingServices,
                    unauthorizedServices,
                    lean: true, // we want .lean() objects
                });

                // If no validation result (staff missing or unauthorized), skip
                if (!validationResult) continue;

                const { staff, serviceObjects } = validationResult;
                // Replace service IDs with full service objects in the staffService itself
                staffService.services = serviceObjects;

                // Collect validated data
                validatedStaffsServices.push({
                    staff,
                    services: serviceObjects, // plain JS objects from .lean()
                });
            }
        }

        // If any of our error arrays have data, throw an error
        if (missingStaffs.length > 0) {
            return next(new AppError(`Missing staff: ${missingStaffs.join(", ")}`, 400));
        }
        if (missingServices.length > 0) {
            return next(
                new AppError(`Missing services: ${JSON.stringify(missingServices)}`, 400)
            );
        }
        if (unauthorizedStaffs.length > 0) {
            return next(
                new AppError(`Unauthorized staff: ${unauthorizedStaffs.join(", ")}`, 400)
            );
        }
        if (unauthorizedServices.length > 0) {
            return next(
                new AppError(
                    `Unauthorized services: ${JSON.stringify(unauthorizedServices)}`,
                    400
                )
            );
        }

        // If no errors, replace the original req.body.slot with the new data (which now has full service objects)
        req.body.slot = {
            ...slot,
            subSlots: subSlots.map((subSlot) => {
                return {
                    ...subSlot,
                    staffServices: subSlot.staffServices.map((staffService) => {
                        // staffService.services is already replaced with full objects
                        return { ...staffService };
                    }),
                };
            }),
        };

        // Make the validated data available downstream
        req.staffsServices = validatedStaffsServices;

        // Proceed
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

            const foundServices = await serviceModel.find({ _id: { $in: services } });

            if (foundServices.length !== services.length) {
                const foundServiceIds = foundServices.map(service => service._id.toString());
                const staffMissingServices = services.filter(id => !foundServiceIds.includes(id));
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


export const verifyAppointmentOwnership = () => {
    return async (req, res, next) => {
        const {appointmentId} = req.body;
        const {clientId} = req.params;
        const {authUser} = req;

        const appointment = await appointmentModel.findOne({_id: appointmentId, clientId: clientId});
        if (!appointment) {
            return next(new AppError("Appointment not found", 404));
        }
        const {customerId, subAppointments} = appointment;
        if(authUser.role?.client){
            return next()
        }
        if (authUser.role?.staff) {
            const isAssignedStaff = subAppointments.some(sub => sub.staffId.toString() === authUser._id.toString());
            if (!isAssignedStaff) {
                return next(new AppError("Staff can only edit appointments they are assigned to", 403));
            }
        } else if (authUser.role?.customer) {
            if (authUser._id.toString() !== customerId.toString()) {
                return next(new AppError("Customers can only edit their own appointments", 403));
            }
        } else {
            return next(new AppError("Unauthorized", 403));
        }

        return next();
    };
}