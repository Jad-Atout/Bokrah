import {AppError} from "../../utils/AppError.js";
import bcrypt from "bcrypt";
import userModel from "../../../DB/models/user.js";
import clientCustomerModel from "../../../DB/models/ClientCustomer.js";
import customerModel from "../../../DB/models/customer.js";
import dotenv from "dotenv";
import {
    transCreateCustomer,
    transDeleteCustomer,
    transUpdateCustomer
} from "../../../DB/Controller/customer.DB.controller.js";
import {sendEmail} from "../../utils/email.js";
import {setPasswordEmailTemplate, welcomeEmailTemplate} from "../../utils/emailTemplete.js";
import jwt from "jsonwebtoken";
import appointment from "../../../DB/models/appointment.js";
import prepareToken from "../../utils/Google/Services/refreshToken.js";
import {cancelAppointment} from "../appointment/controller/cancelAppointment.controller.js";

dotenv.config()

// login directry after confirmation


export const createCustomer = async (req, res, next) => {
    let { userName, email, phoneNumber } = req.body;
    if(email){
        email = email.toLowerCase();
    }
    const filter = {};
    if (email) filter.email = email;
    if (phoneNumber) filter.phoneNumber = phoneNumber;

    let user = await userModel.findOne(filter);
    console.log(user);
    let customer = await customerModel.find({ userId: user?._id });

    if (user) {
        if (customer) return res.status(400).json({ message: "User already exists", user, customer });
    }

    const payload = {
        userName,
        userId: user ? user._id : null,
        authProvider: "actor",
        confirmed: true,
        ...(email ? { email:email } : {}),
        ...(phoneNumber ? { phoneNumber:phoneNumber} : {}),
    };

    const { newUser, customer: newCustomer, appError } = await transCreateCustomer(payload);
    if (appError) return next(appError);

    const clientId = req.authUser.clientId;

    const existingAssignment = await clientCustomerModel.findOne({  customerId: newCustomer._id, clientId });
    if (!existingAssignment) {
        const assign = new clientCustomerModel({ customerId: newCustomer._id, clientId });
        await assign.save();
    }

    const tokenData={id:newUser._id, email:newUser.email,}
    const token = jwt.sign(tokenData, process.env.JWT_CONFIRME_SECRET);
    await sendEmail(newUser.email,  "Welcome",
        await welcomeEmailTemplate( newUser.userName, token)
    );
    await sendEmail(newUser.email,  "Set Your Password & Confirm Your Email",
        await setPasswordEmailTemplate( newUser.userName, token))
    return res.status(201).json({ message: "Successfully created", newUser,newCustomer});
};




export const customerRegister = async (req, res, next) => {
    let { userName, email, password, phoneNumber } = req.body;
    console.log(email)
    if(email){
        email= email.toLowerCase()
    }

    const filter = []
    if(email) filter.push({email})
    if(phoneNumber) filter.push({phoneNumber}) ;
    let user = await userModel.findOne({$or:filter})
    console.log(user)
    console.log(filter)

    if(user) {
        return next(new AppError('User already exists', 401));
    }

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT_ROUND));
    let {newUser,customer,appError} = await transCreateCustomer({userName, email:email, phoneNumber, password:hashedPassword,authProvider: "local"})
    if(appError) return next(appError);
console.log(newUser)
    const tokenData={id:newUser._id, email:newUser.email,}
    const token = jwt.sign(tokenData, process.env.JWT_CONFIRME_SECRET);

    await sendEmail(newUser.email,  "Welcome",
        await welcomeEmailTemplate( newUser.userName, token)
    );
    return res.status(201).json({ message: "Successfully created", newUser,customer });
};

export const getClientCustomers = async (req, res, next) => {
    try {
        const { clientId } = req.authUser;

        const clientCustomers = await clientCustomerModel.find({ clientId });

        const customerIds = clientCustomers.map((cc) => cc.customerId);

        const customers = await customerModel.find({ _id: { $in: customerIds } })
            .populate({
                path: "userId",
                select: "userName email phoneNumber",
            });

        const customersWithStatus = customers.map((customer) => {
            const relationship = clientCustomers.find(cc => cc.customerId.toString() === customer._id.toString());
            return {
                ...customer.toObject(),
                isActive: relationship ? relationship.isActive : false, // Default to false if no relationship exists
            };
        });

        return res.status(200).json({
            message: "success",
            customers: customersWithStatus,
        });

    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};


export const updateCustomer = async (req, res, next) => {
    let { userName, email, password, phoneNumber } = req.body;
    if(email){
        email = email.toLowerCase();
    }

    const {customerId} = req.params

    const customer = await customerModel.findById(customerId);
    if (!customer) return next( new AppError("User doesn't exist", 401))

    const userData = {userName, email, phoneNumber,_id:customer.userId}
    if(password) userData.password = await bcrypt.hash(password, 8);

    let {user:newUser,customer:newCustomer,appError} = await transUpdateCustomer( userData);
    if (appError) {
        return next(appError);
    }
    return res.json({message:"Customer updated successfully",newCustomer,newUser});
}

//TODO fix error here
export const deleteCustomer = async (req, res, next) => {
    const { customerId } = req.params
    const id = req.authUser.customerId
    console.log(customerId,id)
    if(customerId !==id) return next( new AppError("User is not authorized for this action", 401));
    let {user:deletedUser,customer:deletedCustomer,appError} = await transDeleteCustomer(id)
    if (appError) {
        return next(appError);
    }
    return res.status(200).json({message:"Successfully deleted", deletedCustomer,deletedUser});


}

export const toggleBlockCustomer = async (req, res, next) => {
    try {
        const { customerId } = req.params;
        const { clientId } = req.authUser;

        console.log(`[toggleBlockCustomer] clientId=${clientId}, customerId=${customerId}`);

        const relation = await clientCustomerModel.findOne({ clientId, customerId });
        if (!relation) return next(new AppError("Relation does not exist", 401));

        relation.isActive = !relation.isActive;

        if (!relation.isActive) {
            console.log(`[toggleBlockCustomer] Customer blocked — cancelling appointments`);
            cancelBlockedCustomerAppointments(customerId, req.authUser);
        }

        await relation.save();

        return res.status(200).json({ message: "success" });

    } catch (err) {
        next(err);
    }
};

const cancelBlockedCustomerAppointments = async (customerId, authUser) => {
    console.log(`[cancelBlockedCustomerAppointments] Start for customerId=${customerId}`);

    const { clientId } = authUser;

    const appointments = await appointment.find({
        customerId: customerId,
        status: "Booked"
    });
    console.log(appointments)

    console.log(`[cancelBlockedCustomerAppointments] Found ${appointments.length} booked appointments.`);

    const requests = appointments.flatMap(appt =>
        appt.subAppointments.map(sub => ({
            authUser,
            params: {
                clientId,
                appointmentId: appt._id.toString(),
                subAppointmentId: sub._id.toString() // ensure it's a string!
            }
        }))
    );


    console.log(`[cancelBlockedCustomerAppointments] Built ${requests.length} sub-appointment requests.`);

    const middleware1 = prepareToken();

    // Fire-and-forget: run all in parallel
    const tasks = requests.map(async (req, idx) => {
        console.log(`[cancelBlockedCustomerAppointments] Processing sub-appointment ${idx + 1}/${requests.length}`);
        const res = {
            status: () => res,
            json: (data) => console.log(`[Response JSON] ${JSON.stringify(data)}`)
        };

        const next = (err) => {
            if (err) {
                console.error(`[cancelBlockedCustomerAppointments] Middleware error:`, err);
            } else {
                console.log(`[cancelBlockedCustomerAppointments] Token prepared for sub-appointment`);
            }
        };

        try {
            await middleware1(req, res, next);
            await cancelSubAppointment(req, res, next);
            console.log(`[cancelBlockedCustomerAppointments] Sub-appointment cancelled:`, req.params.subAppointmentId);
        } catch (err) {
            console.error(`[cancelBlockedCustomerAppointments] Error cancelling sub-appointment:`, err);
        }
    });

    // Do not await this — fire and forget
    Promise.allSettled(tasks)
        .then(results => {
            console.log(`[cancelBlockedCustomerAppointments] All cancel tasks done:`);
            results.forEach((result, i) => {
                console.log(`  Task ${i + 1}:`, result.status, result.reason || "Success");
            });
        });
};


import websiteModel from '../../../DB/models/website.js';
import {cancelSubAppointment} from "../appointment/controller/subappointments.controller.js";

export const getCustomerAppointments = async (req, res, next) => {
    try {
        const { customerId } = req.params;

        // Find all appointments for this customer
        const appointmentsList = await appointment.find({ customerId })
            .populate([{
                path: "clientId",
                populate: {
                    path: "userId",
                    select: "userName"
                }
            }, {
                path: 'subAppointments',
                populate: [
                    {
                        path: "staffId",
                        select: "roleDescription",
                        populate: {
                            path: "userId",
                            select: "userName email"
                        }
                    },
                    {
                        path: "services._id",
                        model: "Service",
                        select: "serviceName price duration"
                    }
                ]
            }]);

        console.log(JSON.stringify(appointmentsList, null, 2));

        // Collect all unique clientIds from appointments (make sure we get the _id)
        const clientIds = [
            ...new Set(
                appointmentsList.map(app => app.clientId?._id?.toString()).filter(Boolean)
            )
        ];

        // Query all relevant website docs
        const websites = await websiteModel.find(
            { clientId: { $in: clientIds } },
            { clientId: 1, businessName: 1 }
        );

        const clientIdToBusinessName = {};
        websites.forEach(w => {
            clientIdToBusinessName[w.clientId.toString()] = w.businessName;
        });

        // Fetch all client docs for website field
        const clientModel = (await import('../../../DB/models/client.js')).default;
        const clients = await clientModel.find(
            { _id: { $in: clientIds } },
            { _id: 1, website: 1 }
        );

        const clientIdToWebsite = {};
        clients.forEach(c => {
            clientIdToWebsite[c._id.toString()] = c.website;
        });

        // Attach businessName, website, staffName, and serviceName to each appointment/subAppointment
        const appointmentsWithBusinessName = appointmentsList.map(app => {
            const appObj = app.toObject();
            const clientIdStr = appObj.clientId?._id?.toString() || '';

            appObj.businessName = clientIdToBusinessName[clientIdStr] || null;
            appObj.website = clientIdToWebsite[clientIdStr] || null;

            // Add staffName and serviceName to each subAppointment
            if (Array.isArray(appObj.subAppointments)) {
                appObj.subAppointments = appObj.subAppointments.map(subApp => {
                    // Staff name from userId
                    subApp.staffName = subApp.staffId?.userId?.userName || null;

                    // Add serviceName for each service
                    if (Array.isArray(subApp.services)) {
                        subApp.services = subApp.services.map(serv => {
                            let serviceName = null;
                            if (serv._id && typeof serv._id === 'object') {
                                serviceName = serv._id.serviceName || null;
                            }
                            return {
                                ...serv,
                                serviceName,
                                serviceId: serv._id?._id || serv._id
                            };
                        });
                    }
                    return subApp;
                });
            }
            return appObj;
        });

        return res.status(200).json({
            message: 'success',
            appointments: appointmentsWithBusinessName
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};


export const getCustomerById = async (req, res, next) => {
    try {
        const { customerId } = req.params;
        // Populate user info (name, email, phone, etc)
        const customer = await customerModel.findById(customerId).populate({
            path: "userId",
            select: "userName email phoneNumber address"
        });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        return res.status(200).json({
            message: "success",
            customer
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const getCustomersCount = async (req, res, next) => {
    try {
        const customerCount = await customerModel.countDocuments();
        return res.status(200).json({ message: "Success", count: customerCount });
    } catch (error) {
        console.error("Error fetching customer count:", error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};