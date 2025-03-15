import GoogleAuthService from "../../utils/Google/googleAuth.js";
import jwt from "jsonwebtoken";
import { AppError } from "../../utils/AppError.js";
import {
    transCreateClient,
    transDeleteClient,
    transUpdateClient,

} from "../../../DB/Controller/client.DB.controller.js";


export const googleAuthCallback = async (req, res, next) => {
    try {
        const authService = new GoogleAuthService();
        const { code, state } = req.query;

        if (!code) {
            return next(new AppError("Authorization code is missing.", 400));
        }

        const { idToken, access_token, refresh_token } = await authService.handleOAuthRedirect(code);

        const decodedIdToken = jwt.decode(idToken);
        const userData = {
            userName: decodedIdToken?.name,
            email: decodedIdToken?.email,
            authProvider: "google",
            confirmed: decodedIdToken?.email_verified,
        };
        const clientData = {
            businessName: null,
            industry: null,
        };
        const googleData = {
            accessToken: access_token,
            refreshToken: refresh_token,
        };

        const { client, role, user, newClient } = await transCreateClient(
            clientData,
            userData,
            googleData
        );

        const token = jwt.sign(
            {
                userId: user._id,
                userName: user.userName,
                email: user.email,
                role,
                businessName: client.businessName,
                industry: client.industry,
                clientId: client._id,
            },
            process.env.JWT_SECRET
        );

        // 5) Redirect user back to your frontend:
        //    If newClient => we want them to fill brand details => redirect to register page
        //    Otherwise => redirect to dashboard
        const redirectAction = state; // "signup" or "login"
        if ((redirectAction === "signup" && newClient) || (redirectAction === "login" && newClient)) {
            // Brand-new user => ask them for brand info
            return res.redirect(`${process.env.REDIRECT_REGISTER_BASE_URL}?token=${token}&newClient=true`);
        } else {
            // Existing user => go to service provider area
            return res.redirect(`${process.env.REDIRECT_DASHBORD_URL}?token=${token}&newClient=false`);
        }
    } catch (error) {
        return next(error);
    }
};

export const gClientLogin = async (req, res) => {
    const action = req.query.action || "login";
    const authService = new GoogleAuthService();
    const authUrl = authService.generateAuthUrl(action);
    return res.redirect(authUrl);
};

export const getClients = async (req, res) => {
    const { totalClients, clients } = await getAllClients();
    return res.status(200).json({ message: "success", totalClients, clients });
};

// updateClient
export const updateClient = async (req, res, next) => {
    try {
        const { clientId } = req.authUser;
        const { userName, phoneNumber, businessName, industry, staffData } = req.body;
        const userData = { userName, phoneNumber };
        const clientData = { businessName, industry };
        const result = await transUpdateClient(clientId, userData, clientData, staffData);
        if (result instanceof AppError) {
            return next(result);
        }
        return res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// deleteClient
export const deleteClient = async (req, res, next) => {
    try {
        const { clientId } = req.authUser;
        const result = await transDeleteClient(clientId);
        if (result instanceof AppError) {
            return next(result);
        }
        return res.json(result);
    } catch (error) {
        next(error);
    }
};
