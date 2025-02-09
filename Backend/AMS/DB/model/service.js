import {sequelize} from "../connection.js";
import {DataTypes} from "sequelize";



const serviceModel = sequelize.define('Service', {
    id:{
        type:DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    serviceName:{
        type:DataTypes.STRING,
        allowNull:false,
    },
    serviceDescription:{
        type:DataTypes.TEXT,
        allowNull: false,
    },
    price: {
        type:DataTypes.FLOAT,
        defaultValue:0,
    },
    duration:{
        type:DataTypes.INTEGER,
        defaultValue:30,
    }
})


export default serviceModel