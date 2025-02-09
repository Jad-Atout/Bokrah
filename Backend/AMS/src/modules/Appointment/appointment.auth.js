import { userModel } from "../../../DB/model/relations.js";
import { AppError } from "../../utils/AppError.js";

// export const identifyUserRole = async (req, res, next) => {
//     const userId = req.params.id || req.user.id; // Assuming user ID is available in the request
//         const authUser = await userModel.findByPk(userId, {
//             attributes: ["id", "role", "name", "email"]
//         });
//
//         if (!authUser) {
//             return next(new AppError("User not found", 404));
//         }
//
//         req.user = authUser;
//
//         next();
//
// };
export const checkAppointmentExisctence = async (req, res, next) => {

}

// we need do validate that the appointment exists
