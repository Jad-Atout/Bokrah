import nodemailer from "nodemailer";
import {welcomeEmailTemplate} from "../utils/emailTemplete.js"

export async function sendEmail(to, subject, userName, token = "") {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAILSENDER,
            pass: process.env.EMAILPASSWORD,
        },
        tls: {
            rejectUnauthorized: false,
        },
    });

    // Generate the email content
    const html =await welcomeEmailTemplate(to, userName, token);

    return await transporter.sendMail({
        from: `Bokrah <${process.env.EMAILSENDER}>`,
        to,
        subject,
        html,
    });
}