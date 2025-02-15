import nodemailer from 'nodemailer';
export default async function sendEmail(to,subject,from,body) {
    const transporter = nodemailer.createTransport(
        {
            service: 'gmail',
            auth: {
                user: "JadAtout.2003@gmail.com",
                pass: "cnsp zxyg yxzv zvhi"
            }
        })
    const info =  await transporter.sendMail({
        from:"Jad Atout",
        to:"JadAtout.2003@outlook.sa",
        subject:"Hello JadAtout",
        html:`<h1>Hello JadAtout!</h1>`
    })
    console.log('hi')
}