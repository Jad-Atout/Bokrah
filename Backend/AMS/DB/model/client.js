import { sequelize } from "../connection.js";
import { DataTypes } from "sequelize";

const clientModel = sequelize.define("Client", {
    id: { type: DataTypes.INTEGER, primaryKey: true },

    businessName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

export default clientModel;
