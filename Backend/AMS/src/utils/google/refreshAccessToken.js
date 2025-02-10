import {googleModel} from "../../../DB/model/relations.js";
import {AppError} from "../AppError.js";
import {google} from "googleapis";


const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL;
const REFRESH_THRESHOLD_MS = 10 * 60 * 1000; // Refresh the token 10 minutes before it expires




/**
 * Middleware function that prepares and attaches an OAuth2 client for Google Calendar to the request object.
 *
 * This function performs the following tasks:
 * - Extracts the `clientId` from the request params.
 * - Retrieves the corresponding Google Calendar record from the database.
 * - Initializes an OAuth2 client using the refresh token from the database record.
 * - Checks if the access token needs to be refreshed based on its expiration time and refreshes it if necessary.
 * - Attaches the initialized OAuth2 client to the request object for further usage in downstream middleware or routes.
 *
 * If no Google Calendar record is found for the given `clientId`, an error is passed to the next middleware.
 *
 * @function
 * @returns {Function} An asynchronous middleware function for preparing the OAuth2 client.
 * @throws {AppError} Throws an error if the Google Calendar record is not found.
 */
const prepareToken = () => {
    return async (req, res, next) => {
        const {clientId} = req.params;
        const googleCalendar = await googleModel.findOne({where: {clientId}});
        if (!googleCalendar) {
            return next(new AppError('Google calendar record not found for client.', 404));
        }

        // Initialize OAuth client
        const googleOAuthClient = initializeOAuthClient(googleCalendar.refreshToken);
        // Refresh the token 10 minutes before expiry if needed
        await refreshAccessTokenIfNeeded(googleCalendar, googleOAuthClient);
        // Attach OAuth client to the request for downstream usage
        req.oauth2Client = googleOAuthClient;
        return next();
    };
};

export default prepareToken;





/**
 * Initializes and configures a Google OAuth2 client with the provided refresh token.
 *
 * This function creates an instance of Google OAuth2 client using the application-specific
 * client ID, client secret, and callback URL. It then sets the client credentials using
 * the provided refresh token, allowing the client to make authorized requests.
 *
 * @param {string} refreshToken - The refresh token used to authenticate the client and obtain new access tokens.
 * @returns {google.auth.OAuth2} An instance of Google OAuth2 client configured with the provided refresh token.
 */
const initializeOAuthClient = (refreshToken) => {
    const googleOAuthClient = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, CALLBACK_URL);
    googleOAuthClient.setCredentials({refresh_token: refreshToken});
    return googleOAuthClient;
};


/**
 * Refreshes the access token for the Google Calendar if it is nearing expiration.
 *
 * This function checks the current time against the token's expiration time and
 * determines whether the access token needs to be refreshed. If the token is about
 * to expire within a defined threshold, it requests a new token using the OAuth
 * client and updates the Google Calendar record with the new token and expiration time.
 *
 * @param {Object} googleCalendar - The Google Calendar object containing authentication information.
 * @param {string} googleCalendar.tokenExpiry - ISO string representing the current access token's expiration time.
 * @param {string} googleCalendar.accessToken - The current access token for the Google Calendar.
 * @param {Object} oauthClient - The OAuth client used to manage access tokens.
 * @throws {Error} When there is an issue refreshing the access token or updating the calendar record.
 */

const refreshAccessTokenIfNeeded = async (googleCalendar, oauthClient) => {
    const currentTime = Date.now();

    // Parse token expiry time safely
    const tokenExpiryTime = googleCalendar.tokenExpiry
        ? new Date(googleCalendar.tokenExpiry).getTime()
        : 0;

    if (isNaN(tokenExpiryTime)) {
        throw new AppError(`Invalid tokenExpiry date: ${googleCalendar.tokenExpiry}`);
    }


    // Refresh if the token expires within the threshold
    if (tokenExpiryTime - currentTime > REFRESH_THRESHOLD_MS) {
        return; // Token is valid, no need to refresh
    }


    // Refresh access token using OAuth client
    let refreshedData;
    try {
        refreshedData = await oauthClient.refreshAccessToken();
    } catch (error) {
        throw new Error("Failed to refresh access token.");
    }

    // Extract useful fields from refreshedData.credentials
    const refreshedCredentials = refreshedData.credentials; // Drill into `credentials`
    const { expiry_date, access_token } = refreshedCredentials;

    if (!expiry_date || typeof expiry_date !== "number" || expiry_date <= 0) {
        throw new AppError(`Invalid expiry_date value: ${expiry_date}`);
    }

    // Update and save googleCalendar token expiry
    googleCalendar.tokenExpiry = new Date(expiry_date).toISOString();
    googleCalendar.accessToken = access_token; // Optional: store the new access token if needed
    await googleCalendar.save();
    console.log("Token expiry updated and saved.");
};
