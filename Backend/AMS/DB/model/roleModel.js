import sequelize from "../connection.js";
import {DataTypes} from "sequelize";
const roleModel = sequelize.define('Role', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    admin: {
        type: DataTypes.BOOLEAN,
    },
    client: {
        type: DataTypes.BOOLEAN,

    },
    staff: {
        type: DataTypes.BOOLEAN,

    },
    customer: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
})
export default roleModel;