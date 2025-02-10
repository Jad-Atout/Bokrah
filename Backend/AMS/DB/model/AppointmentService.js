import sequelize from "../connection.js";
import {DataTypes} from "sequelize";
import {appointmentModel} from "./relations.js";
import {serviceModel} from "./relations.js"
export const AppointmentService = sequelize.define('AppointmentService', {
    appointmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: appointmentModel, key: 'id' }
    },
    serviceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: serviceModel, key: 'id' }
    }
}, { timestamps: false }); // Disable timestamps if unnecessary
