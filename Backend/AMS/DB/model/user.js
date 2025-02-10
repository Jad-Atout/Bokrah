import sequelize from "../connection.js";
import {DataTypes} from "sequelize";
import clientModel from "./client.js";

const userModel = sequelize.define('User', {
    id:{
        type:DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    userName:{
        type:DataTypes.STRING,
        allowNull:false,
    },
    email:{
        type:DataTypes.STRING,
        defaultValue: null
    },
    phoneNumber:{
        type:DataTypes.STRING,
        defaultValue: null,
        unique:true,
        validate: {
            is: /^[0-9]{10,15}$/, // Only allows numbers (10-15 digits)
        },
    },
    password:{
        type:DataTypes.STRING,
        allowNull: false,
    },
    role:{
        type:DataTypes.ENUM("Admin","Client","Customer","Staff"),
        allowNull:false,
        defaultValue:"Customer"
    },
    confirmed:{
        type:DataTypes.BOOLEAN,
        defaultValue:false

    }
})

export default userModel;