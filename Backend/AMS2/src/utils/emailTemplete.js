export function emailTemplate(email, userName, token) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #4CAF50;">Welcome to Bokrah, ${userName}! 🎉</h2>
            <p>Thank you for joining our website. We're excited to have you on board! Click the link below to confirm your email:</p>
            <a href="${process.env.BASE_URL}/auth/confirmEmail/${token}" 
               style="display: inline-block; padding: 10px 20px; color: white; background-color: #4CAF50; text-decoration: none; border-radius: 5px; margin-top: 10px;">
               Confirm Your Email
            </a>
            <br><br>
            <img src="---------------" alt="Welcome Image" style="max-width: 100%; border-radius: 5px;">
            <p>If you did not sign up for this account, please ignore this email.</p>
            <p>Best Regards,<br><strong>Bokrah Team</strong></p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <footer style="text-align: center; font-size: 12px; color: #888;">
                © ${new Date().getFullYear()} Bokrah. All Rights Reserved.
            </footer>
        </div>
    `;
}
