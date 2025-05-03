import GoogleAuthService from "../../utils/Google/googleAuth.js";
import jwt from "jsonwebtoken";
import { AppError } from "../../utils/AppError.js";
import {
    transCreateClient,
    transDeleteClient,
    transUpdateClient,

} from "../../../DB/Controller/client.DB.controller.js";
import {config} from "dotenv";
import clientModel from "../../../DB/models/client.js";
import websiteModel from "../../../DB/models/website.js";

config()
//TODO Client Validation

export const googleAuthCallback = async (req, res, next) => {
    try {
        const authService = new GoogleAuthService();
        const { code, state } = req.query;

        if (!code) {
            return res.redirect(process.env.FRONTEND_BASE_URL)
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
            about: null,
            city: null,
            address: null
        };
        const websiteData = {
            businessName: null,
            industry: null
        };
        const googleData = {
            accessToken: access_token,
            refreshToken: refresh_token,
        };

        const { client, role, user, newClient, website, appError } = await transCreateClient(
            clientData,
            userData,
            googleData,
            websiteData
        );
        if(appError){
            throw appError;
        }

        const token = jwt.sign(
            {
                userId: user._id,
                userName: user.userName,
                email: user.email,
                role,
                businessName: website.businessName,
                industry: website.industry,
                clientId: client._id,
            },
            process.env.JWT_SECRET
        );

        const redirectAction = state; // "signup" or "login"
        if ((redirectAction === "signup" && newClient) || (redirectAction === "login" && newClient)) {
            return res.redirect(`${process.env.REDIRECT_REGISTER_BASE_URL}?token=${token}&newClient=true`);
        } else {
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
        const { 
            userName, 
            phoneNumber, 
            businessName, 
            industry, 
            staffData,
            websiteUrls,
            about,
            city,
            address,
            instagramUrl,
            facebookUrl
        } = req.body;
        
        const userData = { userName, phoneNumber };
        const clientData = { 
            about,
            city,
            address
        };
        
        const websiteData = {
            businessName,
            industry,
            websiteUrls,
            instagramUrl,
            facebookUrl
        };

        const result = await transUpdateClient(clientId, userData, clientData, staffData, websiteData);
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

export const getClientById = async (req, res, next) => {
    try {
        const { clientId } = req.params;
        
        const client = await clientModel.findById(clientId)
            .populate({
                path: 'userId',
                select: 'userName email phoneNumber confirmed'
            })
            .select('about city address');

        if (!client) {
            return next(new AppError('Client not found', 404));
        }

        const website = await websiteModel.findOne({ clientId });
        console.log(client)
        console.log(website)
        return res.status(200).json({
            message: 'success',
            client: {
                id: client._id,
                businessName: website?.businessName,
                industry: website?.industry,
                staffData: client.staffData,
                websiteUrls: website?.websiteUrls,
                about: client.about,
                city: client.city,
                address: client.address,
                instagramUrl: website?.instagramUrl,
                facebookUrl: website?.facebookUrl,
                user: {
                    userName: client.userId.userName,
                    email: client.userId.email,
                    phoneNumber: client.userId.phoneNumber,
                    confirmed: client.userId.confirmed
                }
            }
        });
    } catch (error) {
        next(error);
    }
};
