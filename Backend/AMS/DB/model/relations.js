import userModel from "./user.js";
import clientModel from "./client.js";
import staffModel from "./staff.js";
import serviceModel from "./service.js";
import appointmentModel from "./appointment.js";
import recurrenceModel from "./recurrence.js";
import googleModel from "./GoogleCalendar.js";
import {AppointmentService} from "./AppointmentService.js"
import {ServicesStaff} from "./ServicesStaff.js";


// User ↔ Client (1:1)
userModel.hasOne(clientModel, {
    foreignKey: 'userId',
    as: 'client'
});

clientModel.belongsTo(userModel, {
    foreignKey: 'userId',
    as: 'user'
});

// User ↔ Staff (1:1)
userModel.hasOne(staffModel, {
    foreignKey: 'userId',
    as: 'staff',
    onDelete:"cascade"
});

staffModel.belongsTo(userModel, {
    foreignKey: 'userId',
    as: 'user'
});

// Client ↔ Staff (1:M)
clientModel.hasMany(staffModel, {
    foreignKey: 'clientId',
    as: 'staffMembers'
});

staffModel.belongsTo(clientModel, {
    foreignKey: 'clientId',
    as: 'client'
});

// Client ↔ Service (1:M)
clientModel.hasMany(serviceModel, {
    foreignKey: 'clientId',
    as: 'services'
});

serviceModel.belongsTo(clientModel, {
    foreignKey: 'clientId',
    as: 'client'
});

// Appointment ↔ Client (M:1)
clientModel.hasMany(appointmentModel, {
    foreignKey: 'clientId',
    as: 'appointments'
});

appointmentModel.belongsTo(clientModel, {
    foreignKey: 'clientId',
    as: 'client'
});

// Appointment ↔ User (M:1) [Customer in your description]
userModel.hasMany(appointmentModel, {
    foreignKey: 'customerId',
    as: 'appointments'
});

appointmentModel.belongsTo(userModel, {
    foreignKey: 'customerId',
    as: 'customer'
});

// Appointment ↔ Service (M:N) using AppointmentService model
appointmentModel.belongsToMany(serviceModel, {
    through: AppointmentService, // Explicit pivot model
    foreignKey: 'appointmentId',
    otherKey: 'serviceId',
    as: 'services'
});

serviceModel.belongsToMany(appointmentModel, {
    through: AppointmentService, // Explicit pivot model
    foreignKey: 'serviceId',
    otherKey: 'appointmentId',
    as: 'appointments'
});

// Appointment ↔ Recurrence (1:1)
appointmentModel.hasOne(recurrenceModel, {
    foreignKey: 'appointmentId',
    as: 'recurrence'
});

recurrenceModel.belongsTo(appointmentModel, {
    foreignKey: 'appointmentId',
    as: 'appointment'
});

// Appointment ↔ Staff (M:1)
appointmentModel.belongsTo(staffModel, {
    foreignKey: "staffId",
    as: "staff",
});

staffModel.hasMany(appointmentModel, {
    foreignKey: "staffId",
    as: "appointments",
});

// Client ↔ Google Calendar (1:1)
clientModel.hasOne(googleModel, {
    foreignKey: 'clientId',
    as: 'calendar'
});

googleModel.belongsTo(clientModel, {
    foreignKey: 'clientId',
    as: 'client'
});

// Staff ↔ Service (M:N) using StaffService model
staffModel.belongsToMany(serviceModel, {
    through: ServicesStaff, // Explicit pivot model
    foreignKey: 'staffId',
    otherKey: 'serviceId',
    as: 'services'
});

serviceModel.belongsToMany(staffModel, {
    through: ServicesStaff, // Explicit pivot model
    foreignKey: 'serviceId',
    otherKey: 'staffId',
    as: 'staffMembers'
});
export { userModel, clientModel, staffModel, serviceModel,googleModel,recurrenceModel,appointmentModel,AppointmentService};
