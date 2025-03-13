import GoogleAuthService from "../../utils/Google/googleAuth.js";
import jwt from "jsonwebtoken";
import {AppError} from "../../utils/AppError.js";
import {transCreateClient, transDeleteClient, transUpdateClient} from "../../../DB/Controller/client.DB.controller.js";

//TODO send set password email send welcome email

export const googleAuthCallback = async (req, res, next) => {
    const authService = new GoogleAuthService();
    const { code } = req.query;

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
    }
    const clientData={
        businessName:null,
        industry:null,
    }
    const googleData = {accessToken:access_token, refreshToken:refresh_token}
    //TODO if client already exists handel the existance don't end it to update 
    const{client,role,user} = await transCreateClient(clientData,userData,googleData)

    const token = jwt.sign(
        {
            userId: user._id,
            userName: user.userName,
            email: user.email,
            role: role,
            businessName:client.businessName,
            industry:client.industry,
            clientId: client._id,
        },
        process.env.JWT_SECRET,
    );

    return res.redirect(`http://localhost:5174/register?token=${token}`);



};

export const gClientLogin = async (req, res) => {
    const authService = new GoogleAuthService();
    const authUrl = authService.generateAuthUrl();
    return res.redirect(authUrl);
};

export const updateClient = async (req, res, next) => {
    const {clientId} = req.authUser
    const {userName,phoneNumber,businessName,industry,staffData} = req.body;
    const userData = {userName,phoneNumber}
    const clientData = {businessName,industry}
    const result =await transUpdateClient(clientId,userData,clientData,staffData)
    if (result instanceof AppError) {
        return next(result);
    }
    return res.status(200).json(result);
};
export const deleteClient = async (req, res, next) => {
    const { clientId} = req.authUser;
    const result = await transDeleteClient(clientId);
    if (result instanceof AppError) {
        return next(result);
    }
    return res.json(result);

};




