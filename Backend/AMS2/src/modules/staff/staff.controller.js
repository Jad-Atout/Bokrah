import staffModel from "../../../DB/models/staff.js"
import {
    populateStaff,
    transCreateStaff,
    transDeleteStaff,
    transUpdateStaff
} from "../../../DB/Controller/staff.DB.controller.js";
import jwt from "jsonwebtoken";
import {sendEmail} from "../../utils/email.js";
import {setPasswordEmailTemplate} from "../../utils/emailTemplete.js"
import {pagination} from "../../utils/pagination.js";
import appointmentModel from "../../../DB/models/appointment.js"
import mongoose from "mongoose";
import {eventDeleteRollback} from "../appointment/controller/helpers.js";
import {AppError} from "../../utils/AppError.js";
import deleteEvent from "../../utils/Google/events/deleteEvent.js";
//TODO get staff bu service and git service by staff

export const createStaff = async (req, res, next) => {

    const {userName, email, phoneNumber, roleDescription} = req.body;
    const {clientId} = req.authUser;
    const oauth2Client= req.oauth2Client
    const {staff,user,appError} = await transCreateStaff(
        {userName, email, phoneNumber, authProvider: "actor"},
        {clientId, roleDescription},
        oauth2Client
    )
    if (appError) {
        return next(appError)
    }
    const tokenData ={id:user._id,email:user.email}
    const token = jwt.sign(tokenData, process.env.JWT_CONFIRME_SECRET);
    await sendEmail(user.email,  "Set Your Password & Confirm Your Email",
         await setPasswordEmailTemplate( user.userName, token)
);
    return res.json({message: "Staff successfully created", staffs:filterStaffData([staff])});
}


function filterStaffData(data) {
    return data.map(staff => ({
            staff: {
                userName: staff.userId.userName,
                email: staff.userId.email,
                phoneNumber: staff.userId.phoneNumber,
                roleDescription: staff.roleDescription,
                availabilityId: staff.availability,
                staffId:staff._id
            },
            client: {
                userName: staff.clientId.userId.userName,
                email: staff.clientId.userId.email,
                industry: staff.clientId.industry,
                businessName: staff.clientId.businessName,
                clientId: staff.clientId.clientId,
            },
            services: staff.services.map(service => ({
                serviceId: service._id,
                serviceName: service.serviceName
            })),

        }))

}


/*export const getClientStaff = async (req, res) => {
    const { clientId } = req.params
    const {skip, limit} = pagination(req.query.page,req.query.limit);
    const staffs = await staffModel.find({clientId: clientId}).populate(populateStaff).skip(skip)
        .limit(limit);
    return res.json({message:"success",staffs:filterStaffData(staffs)},200)
}*/

export const getClientStaff = async (req, res) => {
    const { clientId } = req.params
    const staffs = await staffModel.find({clientId: clientId}).populate(populateStaff);
    return res.json({message:"success",staffs:filterStaffData(staffs)},200)
}

export const deleteStaff = async (req, res, next) => {
        const staffObject  = req.staff;
        const {appError,staff,appointmentIds} = await transDeleteStaff(staffObject,req.oauth2Client);

    if (appError) {
            return next(appError);
        }else if (staff){
            let data = [staff];
            return res.status(200).json({message:"Successfully deleted", staffs:filterStaffData(data)});
        }
        return next({appError,appointmentIds});

};



export const updateStaff = async (req, res, next) => {
        const staffObject  = req.staff;
        const { userName, email, phoneNumber, roleDescription } = req.body;
        const {appError,staff} = await transUpdateStaff(staffObject, { userName, email, phoneNumber }, { roleDescription });
        if (appError) {
            return next(appError);
        }
        let data = [staff]
        return res.json({message:"Successfully updated", staffs:filterStaffData(data)});

};

//TODO
export const deleteAllAppointmentsForStaff = async (req, res, next) => {
    const { staffId } = req.params;
    const authClient = req.oauth2Client;

    // We'll track which events we've deleted, so we can rollback if needed
    let deletedEvents = [];
    // We'll track which appointment docs we remove
    let deletedAppointments = [];

    // Start a session/transaction
    const session = (req.session) ? req.session : await mongoose.startSession();
    session.startTransaction();

    try {
        // 1) Find all appointments referencing staff in subAppointments
        const appointments = await appointmentModel
            .find({ "subAppointments.staffId": staffId })
            .populate([
                {
                    path: "subAppointments.staffId",
                    select: "calendarId" // so we can call deleteEvent
                }
            ])
            .session(session);

        if (!appointments || appointments.length === 0) {
            // no relevant appointments => just commit empty
            await session.commitTransaction();
            session.endSession();
            return res.status(200).json({
                message: `No appointments found for staff ${staffId}.`,
                deletedAppointments: [],
            });
        }

        // 2) For each found appointment, remove from DB and
        //    remove the staff's corresponding Google events
        for (const appointment of appointments) {
            // We'll keep track if this doc references staffId in multiple subAppointments
            let hasSubAppointments = false;

            for (const subAppt of appointment.subAppointments) {
                if (String(subAppt.staffId?._id) === String(staffId)) {
                    hasSubAppointments = true;
                    // Call Google deleteEvent
                    if (subAppt.eventId && subAppt.staffId?.calendarId) {
                        try {
                            const eventData = await deleteEvent(
                                authClient,
                                subAppt.staffId.calendarId,
                                subAppt.eventId
                            );
                            deletedEvents.push({
                                eventId: subAppt.eventId,
                                calendarId: subAppt.staffId.calendarId,
                                eventData,
                            });
                        } catch (googleErr) {
                            // If Google event not found or fail => might not be critical,
                            // but you can handle here or throw an error to rollback
                            console.warn(
                                `Failed to delete Google event ${subAppt.eventId}: ${googleErr}`
                            );
                        }
                    }
                }
            }

            if (hasSubAppointments) {
                // remove entire appointment doc
                await appointmentModel.findByIdAndDelete(appointment._id, { session });
                deletedAppointments.push(appointment);
            }
        }

        // 3) Commit
        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: `Deleted all appointments referencing staff ${staffId}`,
            deletedAppointments,
            deletedEvents,
        });
    } catch (error) {
        // 4) On error => rollback
        await session.abortTransaction();
        session.endSession();

        // Attempt to re-create any google events that we already deleted
        await eventDeleteRollback(req, authClient, deletedEvents, deletedAppointments);

        return next(new AppError(`Failed to delete staff appointments: ${error}`, 500));
    }
};