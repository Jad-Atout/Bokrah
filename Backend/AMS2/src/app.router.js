import {connectDB} from "../DB/connection.js";

import cors from 'cors'
import customerRouter from '../src/modules/customer/customer.router.js';
import clientRouter from "./modules/client/client.router.js";
import serviceRouter from "./modules/service/service.router.js";



const initApp = (app,express) => {
    app.use(express.json());
    app.use(cors())
    connectDB()
app.use('/client',clientRouter)
app.use('/customer', customerRouter)
    app.use('/service', serviceRouter)


    app.use('*',(req,res)=>{
        res.status(404).send('Page Not Found');
    })
    app.use((err, req, res, next) => {
        return res.status(err.statusCode || 500).json({message: err.message || "Internal Server Error"})
    });
}
export default initApp