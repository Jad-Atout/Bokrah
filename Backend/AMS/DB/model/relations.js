import userModel from "./user.js";
import clientModel from "./client.js";
import staffModel from "./staff.js";
import serviceModel from "./service.js";
import appointmentModel from "./appointment.js";
import {AppointmentService, StaffService} from "./connectionTables.js";
import recurrenceModel from "./recurrence.js";
import googleModel from "./GoogleCalendar.js";
import app from "../../src/app.js";


// 🔹 Define Many-to-Many Relationship (Remove Duplicates)
staffModel.belongsToMany(serviceModel, {
    through: StaffService,
    foreignKey: "staffId",
    onDelete: "CASCADE",
});
serviceModel.belongsToMany(staffModel, {
    through: StaffService,
    foreignKey: "serviceId",
    onDelete: "CASCADE",
});

// 🔹 Define One-to-One Relationships for User
userModel.hasOne(clientModel, { foreignKey: "id" });
clientModel.belongsTo(userModel, { foreignKey: "id" });

userModel.hasOne(staffModel, { foreignKey: "id" });
staffModel.belongsTo(userModel, { foreignKey: "id" });

// 🔹 Define One-to-Many Relationship for Client-Service and Client-Staff
clientModel.hasMany(serviceModel, { foreignKey: "clientId" });
serviceModel.belongsTo(clientModel, { foreignKey: "clientId" });
clientModel.hasMany(staffModel,{foreignKey:'clientId'});
staffModel.belongsTo(clientModel,{foreignKey:'clientId'});

//🔹 Define Appointment Relationships

clientModel.hasMany(appointmentModel,{foreignKey:'clientId'});
appointmentModel.belongsTo(clientModel, { foreignKey:'clientId'});

staffModel.hasMany(appointmentModel,{foreignKey:'staffId'});
appointmentModel.belongsTo(staffModel,{foreignKey:'staffId'});

appointmentModel.belongsToMany(serviceModel,{
    through:AppointmentService,
    foreignKey:'appointmentId',
    onDelete: "CASCADE",
})
serviceModel.belongsToMany(appointmentModel,{
    through:AppointmentService,
    foreignKey:'serviceId',
    onDelete: "CASCADE",
})

appointmentModel.hasOne(recurrenceModel,{foreignKey:'appointmentId'});
recurrenceModel.belongsTo(appointmentModel,{foreignKey:'appointmentId'});

appointmentModel.hasOne(recurrenceModel,{foreignKey:'appointmentId'});
recurrenceModel.belongsTo(appointmentModel,{foreignKey:'appointmentId'});

clientModel.hasOne(googleModel,{foreignKey:'clientId'});
googleModel.belongsTo(clientModel, { foreignKey:'clientId'});

appointmentModel.belongsToMany(serviceModel, { through: AppointmentService });
serviceModel.belongsToMany(appointmentModel, { through: AppointmentService });

userModel.hasMany(appointmentModel,{foreignKey:'customerId'});
appointmentModel.belongsTo(userModel, { foreignKey:'customerId'});

export { userModel, clientModel, staffModel, serviceModel, StaffService,AppointmentService,googleModel,recurrenceModel,appointmentModel};
