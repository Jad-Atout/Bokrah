import nodemailer from "nodemailer";
import welcomeEmailTemplate from "../utils/emailTemplete.js"

// await sendEmail(user.email, "Welcome", welcomeEmailTemplate, user.userName, token );
export async function sendEmail(to, subject, userName, token = "") {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAILSENDER,
            pass: process.env.EMAILPASSWORD,
        },
    });

    // Generate the email content
    const html = welcomeEmailTemplate(to, userName, token);

    const info = await transporter.sendMail({
        from: `Bokrah <${process.env.EMAILSENDER}>`,
        to,
        subject,
        html,
    });

    return info;
}