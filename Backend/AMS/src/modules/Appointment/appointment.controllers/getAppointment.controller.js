import {staffModel,userModel,appointmentModel} from "../../../../DB/model/relations.js";
import { AppError } from "../../../utils/AppError.js";

/**
 * Controller function to retrieve appointments based on the user's role and optional target ID.
 * The function handles different user roles (Client, Staff, Customer) and constructs a where condition
 * and include options to fetch appointments accordingly. If the user is a Client or Staff, they can
 * view their own or a specific customer's appointments.
 *
 * @param {Object} req - The request object, containing user and target information.
 * @param {Object} res - The response object to send the fetched appointments.
 * @param {Function} next - The next middleware function to handle errors.
 * @returns {Promise<Object>} - The fetched appointments based on user role and conditions.
 */
export const getAppointments = async (req, res, next) => {
    const { role, id } = req.authUser;  // User role and ID
    const targetId = req.body.id;        // Optional target ID for filtering by customer

    let appointments = [];
    let whereCondition = {};
    let include = [];

    try {
        if (role === "Client") {
            // If the user is a Client, return appointments for that client
            whereCondition = { clientId: id };
            include= [
                {
                    model: staffModel,
                    include: [
                        {
                            model: userModel,
                            attributes: ['id', 'name', 'email', 'role'] // Fetch name, email, role, and id
                        }
                    ]
                }
            ]
        } else if (role === "Staff") {
            // If the user is Staff, return appointments for that staff member
            whereCondition = { staffId: id };
            include = [
                {
                    model: userModel, // Include the User model for the staff
                    where: { role: "Customer" },  // Only include customers
                    attributes: ["id", "name", "email"] // Adjust based on fields in User model
                }
            ];
        } else if (role === "Customer") {
            // If the user is a Customer, return appointments for that customer
            whereCondition = { customerId: id };
            include = [
                {
                    model: staffModel,
                    include: [
                        {
                            model: userModel, // Include the User model for staff (name)
                            attributes: ["id", "name"]
                        }
                    ]
                }
            ];
        } else if (role === "Client" && targetId) {
            // If the Client wants to see a specific Customer's appointments
            whereCondition = { customerId: targetId, clientId: id };
            include = [
                {
                    model: staffModel,
                    include: [
                        {
                            model: userModel, // Include the User model for staff (name)
                            attributes: ["id", "name"]
                        }
                    ]
                }
            ];
        } else if (role === "Staff" && targetId) {
            // If the Staff wants to see a specific Customer's appointments
            whereCondition = { customerId: targetId, staffId: id };
            include = [
                {
                    model: userModel,
                    where: { role: "Customer" },  // Only include customers
                    attributes: ["id", "name", "email"]
                }
            ];
        } else {
            return next(new AppError("Invalid user role or missing targetId", 400));
        }

        appointments = await appointmentModel.findAll({
            where: whereCondition,
            include: include,
        });

        return res.status(200).json({
            message: "Appointments fetched successfully",
            appointments,
        });
    } catch (error) {
        return next(new AppError(`Failed to fetch appointments: ${error}`, 500));
    }
};



