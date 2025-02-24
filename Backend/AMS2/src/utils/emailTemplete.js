import {confirmEmail} from "../Authentication/confirmEmail.auth.js"

//TODO redfine the email structure so it can't be a spam email
export async function welcomeEmailTemplate(email, userName, token) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: rgb(37, 99, 235);">Welcome to Bokrah, ${userName}! 🎉</h2>
            <p>Thank you for joining our website. We're excited to have you on board! Click the link below to confirm your email:</p>
            <a href="${process.env.BASE_URL}/auth/confirmEmail/${token}" 
               style="display: inline-block; padding: 10px 20px; color: white; background-color: rgb(37, 99, 235); text-decoration: none; border-radius: 5px; margin-top: 10px;">
               Confirm Your Email
            </a>
            <br><br>
            <img src="https://res.cloudinary.com/dfz3ebgmr/image/upload/v1740344135/Bookrah_cigw3k.png" alt="Welcome Image" style="max-width: 100%; border-radius: 5px;">
            <p>If you did not sign up for this account, please ignore this email.</p>
            <p>Best Regards,<br><strong>Bokrah Team</strong></p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <footer style="text-align: center; font-size: 12px; color: #888;">
                © ${new Date().getFullYear()} Bokrah. All Rights Reserved.
            </footer>
        </div>
    `;
}

export async function sendCodeTemplate(email, userName, code) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: rgb(37, 99, 235);">Verification Code</h2>
            <p>Hello ${userName},</p>
            <p>Use the following verification code to complete your request:</p>
            <div style="font-size: 24px; font-weight: bold; color: rgb(37, 99, 235); text-align: center; padding: 10px; border: 1px dashed rgb(37, 99, 235); border-radius: 5px; display: inline-block;">
                ${code}
            </div>
            <p>This code is valid for a limited time. If you did not request this code, please ignore this email.</p>
            <p>Best Regards,<br><strong>Bokrah Team</strong></p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <footer style="text-align: center; font-size: 12px; color: #888;">
                © ${new Date().getFullYear()} Bokrah. All Rights Reserved.
            </footer>
        </div>
    `;
}

export async function setPasswordEmailTemplate( userName, token) {

    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: rgb(37, 99, 235);">Set Your Password & Confirm Your Email, ${userName}! 🔐</h2>
            <p>You're almost there! To complete your registration, please set your password and confirm your email by clicking the button below:</p>
            
            <a href="${process.env.BASE_URL}/auth/set-password/${token}" 
               style="display: inline-block; padding: 10px 20px; color: white; background-color: rgb(37, 99, 235); text-decoration: none; border-radius: 5px; margin-top: 10px;">
               Set Your Password
            </a>

            <br><br>
            <img src="https://res.cloudinary.com/dfz3ebgmr/image/upload/v1740344135/Bookrah_cigw3k.png" 
                 alt="Bokrah Logo" 
                 style="max-width: 100%; border-radius: 5px;">
            
            <p>If you did not sign up for this account, please ignore this email.</p>
            
            <p>Best Regards,<br><strong>Bokrah Team</strong></p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <footer style="text-align: center; font-size: 12px; color: #888;">
                © ${new Date().getFullYear()} Bokrah. All Rights Reserved.
            </footer>
        </div>
    `;
}
