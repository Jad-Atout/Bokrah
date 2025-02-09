import {userModel} from "../../DB/model/relations.js";
const validateUserExistence = () => {
    // we have a bug where that happens in client controller
    // this model allows for two different phone numbers to exists
    // when searching it returns null event though the phone number exists in the db
    return async (req,res,next)=>{
        const {id}= req.params;
        const {email,phoneNumber} = req.body;
        const whereConditions = {};
        if (email) whereConditions.email = email;
        if (phoneNumber) whereConditions.phoneNumber = phoneNumber;
        if (id) whereConditions.id = id;
        req.user  = await userModel.findOne({
            where:whereConditions
        })
        return next()
    }

}
export default validateUserExistence