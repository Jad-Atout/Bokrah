import sequelize from "../connection.js";
import {DataTypes} from "sequelize";
import {serviceModel, staffModel} from "./relations.js";

export const ServicesStaff = sequelize.define('ServicesStaff', {
    staffId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: staffModel, key: 'id' }
    },
    serviceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: serviceModel, key: 'id' }
    }
}, { timestamps: false }); // Disable timestamps if unnecessary
