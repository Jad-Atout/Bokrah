import {sequelize} from "../connection.js";
import {DataTypes} from "sequelize";

const recurrenceModel = sequelize.define("Recurrence", {
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    type:{
        type:DataTypes.ENUM('Weekly','Monthly','Daily'),
        allowNull:false,
    },
    startDate:{
        type: DataTypes.DATE,
        allowNull: false,
    },
    endDate:{
        type: DataTypes.DATE,
        allowNull: false,
    },
    numberOfRecurrences:{
        type: DataTypes.INTEGER,

    }
})
export default recurrenceModel