import clientModel from "../models/client.js"

export const createClient = async (clientData)=>{
    return clientModel(clientData)
}
export const findClientByUserId = async (id)=>{
    return await clientModel.findOne({userId: id})
}