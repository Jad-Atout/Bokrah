import appointmentModel from "../models/appointment.js";
import {connectDB} from "../connection.js";
import  websiteModel from "../models/website.js";
import {appointmentConfirmationEmail, appointmentFullDetailsEmail} from "../../src/utils/emailTemplete.js";
import {sendEmail} from "../../src/utils/email.js";
await connectDB()
import { config } from "dotenv";

config();

await sendEmail("JadAtout.2003@gmail.com","Appointment Booked",await appointmentFullDetailsEmail("6858875b8cdf3ad8a9e2a97b"))
