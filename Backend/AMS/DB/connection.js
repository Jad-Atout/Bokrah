import {Sequelize} from 'sequelize';

export const sequelize = new Sequelize('ams','root','',{
    host: 'localhost',
    dialect: 'mysql',
})
export async function createDatabaseConnection(){
    await sequelize.sync({force:false}).then(()=>{
        console.log('Database connection successfully created!');
    }).catch(err=>{
        console.log('Database connection failed!');
        console.log(err);
    })
}
