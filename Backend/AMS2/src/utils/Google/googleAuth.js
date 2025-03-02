import {google} from "googleapis";
import dotenv from "dotenv";

dotenv.config()

export default class GoogleAuthService{
    static #CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    static #CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    static #CLIENT_URI = process.env.CALLBACK_URL;
    static #SCOPES = ["profile", "email", "https://www.googleapis.com/auth/calendar"];
    #oauthClient

    constructor() {
        this.#oauthClient = new google.auth.OAuth2(
            GoogleAuthService.#CLIENT_ID,
            GoogleAuthService.#CLIENT_SECRET,
            GoogleAuthService.#CLIENT_URI
        )
    }
    generateAuthUrl(){
        return this.#oauthClient.generateAuthUrl({
            access_type: 'offline',
            scope:GoogleAuthService.#SCOPES,
            include_granted_scopes:true,
            prompt:'consent'
        })
    }
    async handleOAuthRedirect(authCode){
        const {tokens} = await this.#oauthClient.getToken(authCode);
        this.#oauthClient.setCredentials(tokens);
        return{
            idToken:tokens.id_token,
            access_token:tokens.access_token,
            refresh_token:tokens.refresh_token,
        }
    }
}

