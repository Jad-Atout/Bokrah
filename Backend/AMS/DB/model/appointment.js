import sequelize from "../connection.js";
import {DataTypes} from "sequelize";
const appointmentModel = sequelize.define('Appointment', {
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    startTime:{
        type: DataTypes.DATE,
        allowNull: false
    },
    endTime:{
        type: DataTypes.DATE,
        allowNull: false
    },
    status:{
        type:DataTypes.ENUM('Booked','Cancelled','Pending'),
        allowNull: false,
        defaultValue:'Booked'
    },
    eventId:{
        type:DataTypes.STRING,
    }

})
export default appointmentModel;