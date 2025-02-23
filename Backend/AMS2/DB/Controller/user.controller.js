import userModel from '../models/user.js';
export const creatUser = async (userData)=>{
    const user = userModel(userData);
    return await user.save();
}