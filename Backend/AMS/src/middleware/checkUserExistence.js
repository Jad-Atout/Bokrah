import {userModel} from "../../DB/model/relations.js";
import {Op} from "sequelize";
const validateUserExistence = () => {
    // we have a bug where that happens in client controller
    // this model allows for two different phone numbers to exists
    // when searching it returns null event though the phone number exists in the db
    return async (req,res,next)=>{
        const {id}= req.params;
        const {email,phoneNumber} = req.body;
        const whereConditions = [];
        if (email) whereConditions.push({ email });
        if (phoneNumber) whereConditions.push({ phoneNumber });
        if (id) whereConditions.push({ id });

        if (whereConditions.length > 0) {
            req.user = await userModel.findOne({
                where: { [Op.or]: whereConditions },
            });
        }
        return next()
    }

}
export default validateUserExistence