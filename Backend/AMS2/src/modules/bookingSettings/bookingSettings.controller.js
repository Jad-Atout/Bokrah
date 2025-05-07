import { AppError } from "../../utils/AppError.js";
import BookingSettings from "../../../DB/models/bookingSettings.js";

export const getBookingSettings = async (req, res, next) => {
    try {
        const { clientId } = req.authUser;

        let settings = await BookingSettings.findOne({ clientId });
        
        // If no settings exist, create default settings
        if (!settings) {
            settings = await BookingSettings.create({ clientId });
        }

        res.status(200).json({
            message: "Success",
            settings
        });
    } catch (error) {
        console.error("Error in getBookingSettings:", error);
        return next(new AppError(`Failed to retrieve booking settings: ${error.message}`, 500));
    }
};

export const updateBookingSettings = async (req, res, next) => {
    try {
        const { clientId } = req.authUser;
        const {
            cancellationPolicy,
            bookingFlow,
            servicesDisplay,
            bookingPolicy,
            termsAndConditions,
            confirmationRedirect
        } = req.body;

        // Validate cancellation policy if provided
        if (cancellationPolicy && !["anytime", "1 hour", "2 hours", "4 hours", "6 hours"].includes(cancellationPolicy)) {
            return next(new AppError("Invalid cancellation policy", 400));
        }

        // Update or create settings
        const settings = await BookingSettings.findOneAndUpdate(
            { clientId },
            {
                ...(cancellationPolicy && { cancellationPolicy }),
                ...(bookingFlow && { bookingFlow }),
                ...(servicesDisplay && { servicesDisplay }),
                ...(bookingPolicy && { bookingPolicy }),
                ...(termsAndConditions && { termsAndConditions }),
                ...(confirmationRedirect && { confirmationRedirect })
            },
            { new: true, upsert: true }
        );

        res.status(200).json({
            message: "Booking settings updated successfully",
            settings
        });
    } catch (error) {
        console.error("Error in updateBookingSettings:", error);
        return next(new AppError(`Failed to update booking settings: ${error.message}`, 500));
    }
}; 