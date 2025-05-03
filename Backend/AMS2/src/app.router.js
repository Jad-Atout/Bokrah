import {connectDB} from "../DB/connection.js";

import cors from 'cors'
import customerRouter from '../src/modules/customer/customer.router.js';
import clientRouter from "./modules/client/client.router.js";
import serviceRouter from "./modules/service/service.router.js";
import staffRouter from "./modules/staff/staff.router.js";
import linkingRouter from "./modules/linking/linking.router.js";
import authRouter from "./Authentication/auth.router.js";
import websiteRouter from "./modules/website/website.router.js";
import availabilityRouter from "./modules/availability/availability.router.js";
import appointmentRouter from "./modules/appointment/appointment.router.js";

import 'dotenv/config'
import reminderRouter from "./modules/reminder/reminder.router.js";
import notificationRouter from "./modules/notification/notification.router.js";
import preferencesRouter from "./modules/preferences/preferences.router.js";



const initApp = (app,express) => {
    app.use(express.json());
    app.use(cors())
    connectDB()

    app.use('/client',clientRouter)
    app.use('/customer', customerRouter)
    app.use('/service', serviceRouter)
    app.use('/staff', staffRouter)
    app.use('/link', linkingRouter)
    app.use('/auth',authRouter)
    app.use('/website', websiteRouter)
    app.use('/availability',availabilityRouter )
    app.use('/appointment',appointmentRouter )
    app.use("/reminder", reminderRouter);
    app.use('/notification',notificationRouter)
    app.use('/notificationPreferences',preferencesRouter)



    app.use('*',(req,res)=>{
        res.status(404).send('Page Not Found');
    })
    app.use((err, req, res, next) => {
        return res.status(err.statusCode || 500).json({message: err.message || "Internal Server Error"})
    });
}
export default initApp