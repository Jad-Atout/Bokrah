import {DataTypes} from "sequelize";
import {sequelize} from "../connection.js";

export const AppointmentServices = sequelize.define('AppointmentService', {
    appointmentId: { type: DataTypes.INTEGER, allowNull: false },
    serviceId: { type: DataTypes.INTEGER, allowNull: false },
});