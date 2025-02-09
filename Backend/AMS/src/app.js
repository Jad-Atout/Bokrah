import customerRouter from "./modules/customer/customer.router.js";
import {createDatabaseConnection} from "../DB/connection.js";
import clientRouter from "./modules/client/client.router.js";
import adminRouter from "./modules/Admin/admin.router.js";
import staffRouter from "./modules/Staff/staff.router.js";
import serviceRouter from "./modules/Services/service.router.js";
import appointmentRouter from "./modules/Appointment/appointment.router.js";
const initApp = (app,express) => {
    app.use(express.json());
    createDatabaseConnection()
    app.use('/customers', customerRouter)
    app.use('/clients', clientRouter)
    app.use('/admins', adminRouter)
    app.use('/staffs', staffRouter)
    app.use('/services', serviceRouter)
    app.use('/appointments', appointmentRouter)

    app.use((err, req, res, next) => {
        return res.status(err.statusCode || 500).json({message: err.message || "Internal Server Error"})
    });
}
export default initApp