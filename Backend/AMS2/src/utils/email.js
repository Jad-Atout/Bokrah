import nodemailer from "nodemailer";


//   await sendEmail(email, "Welcome", welcomeEmailTemplate, { userName, token });
export async function sendEmail(to, subject, html) {

    const transporter = nodemailer. createTransport({
        service: 'gmail',
        auth: {
            user : process.env.EMAILSENDER,
            pass: process.env.EMAILPASSWORD,

        },
    });

    const info = await transporter. sendMail({
        from: `Bokrah <${process.env.EMAILSENDER}>`,
        to,
        subject,
        html:emailTemplate(to, userName,token)
    });

    return info;

}