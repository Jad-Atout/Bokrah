import sequelize from "../connection.js";
import {DataTypes} from "sequelize";

const reminderModel = sequelize.define("Reminder", {
    id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    message:{
        type:DataTypes.TEXT,
        defaultValue:'You have an appointment with Jad Atout'
    },
    scheduledTime:{
        type:DataTypes.TIME,
        allowNull:false,
    },
    deliveryMethode:{
        type:DataTypes.ENUM('Email','SMS'),
        defaultValue: 'Email'
    }
})
export default reminderModel;