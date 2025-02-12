import {Sequelize} from 'sequelize';

 const sequelize = new Sequelize('ams','root','',{
    host: 'localhost',
    dialect: 'mysql',
     logging: false,
})
export async function createDatabaseConnection(){
    await sequelize.sync({force:false}).then(()=>{
        console.log('Database connection successfully created!');
    }).catch(err=>{
        console.log('Database connection failed!');
    })
}

/**
 * Wraps Sequelize transactional logic into a reusable function.
 *
 * @param {Function} callbackFunc - The callback function where the transaction is executed.
 * @returns {*} The result of the callback function execution if successful.
 * @throws {Error} Rollbacks transaction if an error occurs.
 */
export const transaction = async (callbackFunc) => {
    const t = await sequelize.transaction(); // Create a transaction
    try {
        const result = await callbackFunc(t); // Pass the transaction to the callback
        await t.commit(); // Commit changes if successful
        return result;
    } catch (error) {
        await t.rollback(); // Rollback all DB changes if an error occurs
        throw error; // Re-throw the error for the caller to handle
    }
};

export default sequelize