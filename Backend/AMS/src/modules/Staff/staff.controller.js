import { AppError } from "../../utils/AppError.js";
import bcrypt from "bcrypt";
import userModel from "../../../DB/model/user.js";
import staffModel from "../../../DB/model/staff.js";
import getOrCreateSubCalendar from "../../utils/Google/Services/calendarManagement.js";
import { transaction } from "../../../DB/connection.js";

export const createStaff = async (req, res, next) => {
    try {
        if (req.user) {
            return next(
                new AppError("Staff with this email or phone number already exists", 409)
            );
        }
        const { userName, email, password, phoneNumber, roleDescription, availability } = req.body;
        const hashedPassword = await bcrypt.hash(password, 8);
        const authUserId = req.authUser.id;
        const oauth2Client = req.oauth2Client;

        const result = await transaction(async (t) => {
            const user = await userModel.create(
                { userName, email, password: hashedPassword, phoneNumber, role: "Staff" },
                { transaction: t }
            );

            // Ensure the user record is created
            if (!user || !user.id) {
                throw new AppError("Failed to create user - ID not generated.", 500);
            }

            // Step 2: Create staff record (details)
            const staff = await staffModel.create(
                {
                    id: user.id, // Use user ID for staff ID
                    userId: user.id,
                    clientId: authUserId,
                    ...(roleDescription && { roleDescription }),
                    ...(availability && { availability }),
                },
                { transaction: t }
            );

            // Ensure the staff record is created
            if (!staff || !staff.id) {
                throw new AppError("Failed to create staff - ID not generated.", 500);
            }

            // Step 3: Generate and assign calendar ID
            const calendarId = await getOrCreateSubCalendar(oauth2Client, staff.id);

            if (!calendarId) {
                throw new AppError("Calendar ID generation failed.", 500);
            }

            // Save calendarId to staff record
            await staff.update(
                { CalendarId:calendarId },
                { where: { id: staff.id }, transaction: t }
            );
            // Return completed staff data
            return { staff, userName: user.userName, calendarId };
        });

        // Successful response
        return res.status(201).json({ message: "Staff successfully created.", ...result });
    } catch (error) {
        console.error("Error in createStaff:", error);
        return next(new AppError(error.message || "An error occurred", 500));
    }
};