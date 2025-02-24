import nodemailer from "nodemailer";

export async function sendEmail(to, subject, func) {
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
    const html = await func
    return await transporter.sendMail({
        from: `Bokrah <${process.env.EMAILSENDER}>`,
        to,
        subject,
        html
    });
}