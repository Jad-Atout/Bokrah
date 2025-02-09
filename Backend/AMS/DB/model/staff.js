import {sequelize} from "../connection.js";
import {DataTypes} from "sequelize";

const staffModel = sequelize.define("Staff", {
   id:{
       type: DataTypes.INTEGER,
       primaryKey: true,
   },
    role_description:{
       type:DataTypes.STRING,
    },
    availability:{
       type:DataTypes.STRING,
    },
    CalendarId:{
       type:DataTypes.STRING,

    }
})


export default staffModel