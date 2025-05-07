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
import { generateWebsiteUrl } from '../../utils/websiteUtils.js';

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
        console.log(error)
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
            facebookUrl,
            customWebsiteName
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

        // Handle logo upload if present
        if (req.file) {
            websiteData.logo = {
                url: req.file.path,
                publicId: req.file.filename
            };
        }

        if (customWebsiteName) {
            const client = await clientModel.findById(clientId);
            if (!client) {
                return next(new AppError('Client not found', 404));
            }

            const website = await websiteModel.findOne({ clientId });
            if (!website) {
                return next(new AppError('Website not found', 404));
            }

            // Use customWebsiteName if provided, otherwise use businessName
            const websiteName = customWebsiteName ;
            
            // Check if the website name is already taken by another client
            const existingClient = await clientModel.findOne({ 
                customWebsiteName: websiteName,
                _id: { $ne: clientId } 
            });
            
            if (existingClient) {
                return next(new AppError('This website name is already taken', 400));
            }

            // Generate new website URL
            const { fullUrl, websitePath } = generateWebsiteUrl(client, websiteName);
            
            // Update client's website information
            client.customWebsiteName = websiteName;
            client.website = fullUrl;
            await client.save();
        }

        const result = await transUpdateClient(clientId, userData, clientData, staffData, websiteData);
        if (result instanceof AppError) {
            return next(result);
        }

        // Get updated client and website information
        const updatedClient = await clientModel.findById(clientId)
            .populate({
                path: 'userId',
                select: 'userName email phoneNumber confirmed'
            })
            .select('about city address website customWebsiteName');

        const updatedWebsite = await websiteModel.findOne({ clientId });

        return res.status(200).json({
            ...result,
            website: {
                url: updatedClient.website,
                customName: updatedClient.customWebsiteName,
                businessName: updatedWebsite?.businessName
            }
        });
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
                select: 'userName email phoneNumber confirmed '
            })
            .select('about city address website');

        if (!client) {
            return next(new AppError('Client not found', 404));
        }

        const website = await websiteModel.findOne({ clientId });
        return res.status(200).json({
            message: 'success',
            client: {
                id: client._id,
                businessName: website?.businessName,
                industry: website?.industry,
                staffData: client.staffData,
                website: client?.website,
                websiteUrls: website?.websiteUrls,
                about: client.about,
                city: client.city,
                address: client.address,
                instagramUrl: website?.instagramUrl,
                facebookUrl: website?.facebookUrl,
                logo: website?.logo,
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
