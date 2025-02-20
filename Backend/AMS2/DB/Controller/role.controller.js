import roleModel from '../models/role.js';
export const createRole = async ({admin=false,client=false,staff=false,customer=false},session=null)=>{
    const role = new roleModel(
        {
            admin,
            client,
            staff,
            customer,
        })
    await role.save({session})
    return role
}