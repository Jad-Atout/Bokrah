import { googleModel } from "../../../DB/model/relations.js";
import { AppError } from "../AppError.js";
import { google } from "googleapis";

/**
 * Middleware to prepare Google OAuth2 client with refreshed access token.
 */
const prepareToken = () => {
    return async (req, res, next) => {
            const { clientId } = req.body;
            const googleCalendar = await googleModel.findOne({
                where: {
                    clientId: clientId,
                },
            });
            if (!googleCalendar) {
                return next(new AppError('Google calendar record not found for client.', 404));
            }
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.CALLBACK_URL
            );
            oauth2Client.setCredentials({
                refresh_token: googleCalendar.refreshToken,
            });
            const { credentials } = await oauth2Client.refreshAccessToken();
            googleCalendar.accessToken = credentials.access_token;
            await googleCalendar.save();
            req.oauth2Client = oauth2Client;
            return next();
    };
};
export default prepareToken ;