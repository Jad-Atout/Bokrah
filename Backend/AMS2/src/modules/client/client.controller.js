import GoogleAuthService from "../../utils/Google/googleAuth.js";
import jwt from "jsonwebtoken";
import {AppError} from "../../utils/AppError.js";
import clientModel from "../../../DB/models/client.js"
import {sendEmail} from "../../utils/email.js";
import {transCreateClient} from "../../../DB/Controller/client.DB.controller.js";

export const googleAuthCallback = async (req, res, next) => {
    const authService = new GoogleAuthService();
    const { code, state } = req.query;
    const formData = state ? JSON.parse(decodeURIComponent(state)) : {};
    const { businessName, industry,phoneNumber } = formData;

    if (!code) {
        return next(new AppError("Authorization code is missing from the callback.", 400));
    }

    const { idToken, access_token, refresh_token } = await authService.handleOAuthRedirect(code);
    const decodedIdToken = jwt.decode(idToken);
    const userData  = {
        userName:decodedIdToken.name,
        email:decodedIdToken.email,
        authProvider: "google",
        confirmed: decodedIdToken.email_verified,
        phoneNumber:phoneNumber
    }
    const clientData={
        businessName:businessName,
        industry:industry,
    }
    const googleData = {accessToken:access_token, refreshToken:refresh_token}

    const{client,role,user} = await transCreateClient(clientData,userData,googleData)
    const token = jwt.sign(
        {
            userId: user._id,
            userName: user.userName,
            email: user.email,
            role: role.toObject(),
            businessName:client.businessName,
            industry:client.industry,
            clientId: client._id,
        },
        process.env.JWT_SECRET,
    );

    // await sendEmail(user.email, "Welcome", user.userName, token);
    

    return res.status(200).json({
        message: "Google authentication successful.",
        token,
    });


};

export const gClientLogin = async (req, res) => {
    const { businessName, industry,phoneNumber } = req.query;  // Get params from the request
    const authService = new GoogleAuthService();
    const authUrl = authService.generateAuthUrl();
    const modifiedAuthUrl = `${authUrl}&state=${encodeURIComponent(JSON.stringify({ businessName, industry,phoneNumber }))}`;
    return res.redirect(modifiedAuthUrl);
};





