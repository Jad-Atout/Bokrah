import {staffModel, userModel, appointmentModel, AppointmentService} from "../../../../DB/model/relations.js";
import { AppError } from "../../../utils/AppError.js";
import {serviceModel} from "../../../../DB/model/relations.js";
import {clientModel} from "../../../../DB/model/relations.js";
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
    let include = {};
    try {
        if (targetId) {
            if (role === "Client") {
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
            } else if (role === "Staff") {
                // If the Staff wants to see a specific Customer's appointments
                whereCondition = { customerId: targetId, staffId: id };
                include = [
                    {
                        model: userModel,
                        where: { role: "Customer" },  // Only include customers
                        attributes: ["id", "name", "email"]
                    }
                ];
            }
        } else {
            if (role === "Client") {
                // If the user is a Client, return appointments for that client
                whereCondition = { clientId: id };
                include = {
                    model: staffModel,
                    where: { id: Sequelize.col('Appointment.staffId') }, // Ensures the correct staff is fetched based on the appointment's staffId
                    include: {
                        model: userModel,
                        as: 'user', // Correct alias for the relationship between Staff and User
                        required: true // Ensures that the user will be fetched along with the staff
                    }
                };
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
            }
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
        return next(new AppError(`Failed to fetch appointments: ${error.message}`, 500));
    }
};







export const getCustomerAppointment = async (req, res, next) => {
    const id = req.params.id;
    const clientId = req.authUser.clientId;
    let whereCondition ={
       customerId: id,
        clientId: clientId,
    }
    const appointments = await appointmentModel.findAll({
        where: whereCondition,

        include: [
            {
                model: clientModel,
                as: 'client',
                attributes: ['businessName','id']
            },
            {
                model: staffModel,
                as: 'staff',
                include: [
                    {
                        model: userModel,
                        as: "user",
                        attributes: ["id", "userName"],
                    },
                ],
                attributes: ["id"],
            },

            {
                model: serviceModel,
                as: 'services',
                through: { attributes: [] },
                attributes: ['id','serviceName', 'serviceDescription', 'price', 'duration']
            }
        ]
    });

    return res.status(200).json({
        message: "Appointments fetched successfully",
        appointments
    });


}


/**
 * Retrieves user-specific appointments based on the authenticated user's role (Client, Staff, or Customer).
 * Fetches the appointments along with their associated data, including client details, staff details,
 * and associated services.
 *
 * The function determines the user's role from the authentication object and constructs
 * a query condition to filter the appointments accordingly.
 *
 * @param {Object} req - The request object, containing authentication and other data.
 * @param {Object} res - The response object for sending a JSON response with fetched appointments.
 * @param {Function} next - The next middleware function in the application pipeline (if applicable).
 *
 * @returns {Promise} Resolves with a response object containing the success status and appointment details.
 *
 * Models Included:
 * - `clientModel`: Includes information about the client, such as business name and id.
 * - `staffModel`: Includes the staff member's id and associated user details such as userName and id.
 * - `serviceModel`: Includes details about the services such as id, name, description, price, and duration.
 */
export const getUserAppointments = async (req, res, next) => {

    const id = req.authUser.id
    const role = req.authUser.role;
    let whereCondition = {};
    switch (role){
        case "Client": whereCondition = { clientId: id };
        break
        case "Staff": whereCondition = { staffId: id };
        break
        case "Customer": whereCondition = { customerId: id };
        break

    }

        // Fetch appointments with associated data
        const appointments = await appointmentModel.findAll({
            where: whereCondition,

            include: [
                {
                    model: clientModel,
                    as: 'client',
                    attributes: ['businessName','id']
                },
                {
                    model: staffModel,
                    as: 'staff',
                    include: [
                        {
                            model: userModel,
                            as: "user",
                            attributes: ["id", "userName"],
                        },
                    ],
                    attributes: ["id"],
                },

                {
                    model: serviceModel,
                    as: 'services',
                    through: { attributes: [] },
                    attributes: ['id','serviceName', 'serviceDescription', 'price', 'duration']
                }
            ]
        });

        return res.status(200).json({
            message: "Appointments fetched successfully",
            appointments
        });

};