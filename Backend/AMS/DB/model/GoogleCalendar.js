import {sequelize} from "../connection.js";
import {DataTypes, Sequelize} from "sequelize";

const googleModel = sequelize.define("GoogleCalendar", {
    clientId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
    },
    accessToken:{
        type: DataTypes.TEXT,
        allowNull: false,
    },
    refreshToken:{
        type: DataTypes.TEXT,
        allowNull: false,
    }
})
export default googleModel