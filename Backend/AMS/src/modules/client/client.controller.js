import bcrypt from "bcrypt";
import userModel from "../../../DB/model/user.js";
import clientModel from "../../../DB/model/client.js";
import {AppError} from "../../utils/AppError.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import GoogleAuthService from "../../utils/Google/Services/googleAuth.js";
import {googleModel} from "../../../DB/model/relations.js";
import _ from "lodash"
dotenv.config();
// for the following controller we need to improve registration and login in both ways

export const clientRegister = async (req, res,next) => {
    const user_ = req.user;
    if(user_){
        return next(new AppError("User already exists!",409));
    }
    const{userName,email,phoneNumber,password,businessName} = req.body
    const hashedPassword = await bcrypt.hash(password, 8)
    const user = await userModel.create({
        userName,
        email,
        password:hashedPassword,
        role:"Client",
        phoneNumber})

    const client = await clientModel.create({
        id:user.id,
        businessName
    })

    return res.status(201).json({
        message: "Client Successfully Created",
        clientName: user.userName,
        email: user.email,
        businessName: client.businessName
    });
}
export const clientLogin = async (req, res,next) => {
    const user_ = req.user;
    if(!user_){
        return next(new AppError("User does not exist!"),409);
    }
    const {password} = req.body

    if(user_.role!='Client'){
        return next(new AppError("You're not a service Provider",401))
    }
    const validPassword = await bcrypt.compare(password, user_.password);
    if(!validPassword){
        return next(new AppError("Invalid Password",401))
    }
    const client = await clientModel.findByPk(user_.id)
    const token = jwt.sign({
        id: user_.id,
        userName: user_.userName,
        email: user_.email,
        businessName: client.businessName,
        role: user_.role
    },process.env.JWT_SECRET)
    return res.status(201).json({message: "Login Successfully",token})
}


export const googleAuthCallback = async (req, res, next) => {
        const authService = new GoogleAuthService();
        const { code } = req.query;
        if (!code) {
            return next(new AppError("Authorization code is missing from the callback.", 400));
        }
        const tokens = await authService.handleOAuthRedirect(code);
        const { idToken, access_token, refresh_token } = tokens;
        const decodedIdToken = jwt.decode(idToken);
        // Find matching user
        const existingUser = await userModel.findOne({ where: { email: decodedIdToken.email } });
        if (!existingUser) {
            return next(new AppError("User does not exist.", 404));
        }

        // Find or create a record in the googleModel for the user
        let googleCredentials = await googleModel.findByPk(existingUser.id);
        if (!googleCredentials) {
            googleCredentials = await googleModel.create({
                clientId: existingUser.id,
                refreshToken: refresh_token,
                accessToken: access_token,
            });
        } else {
            // If already exists, update the refreshToken/accessToken
            googleCredentials.refreshToken = refresh_token;
            googleCredentials.accessToken = access_token;
            await googleCredentials.save();
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                id: existingUser.id,
                userName: existingUser.userName,
                email: existingUser.email,
                role: existingUser.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Add a token expiration
        );

        return res.status(200).json({
            message: "Google authentication successful.",
            token,
        });

};
export const gClientLogin = async (req, res) => {
    const authService = new GoogleAuthService();
    const authUrl = authService.generateAuthUrl();
    return res.redirect(authUrl);
}


export const deleteClient = async (req, res,next) => {
    const user = req.user;
    if(!user){
        return next(new AppError("User does not exist!"),401);
    }
    const client = await user.destroy()
    return res.status(201).json({message:"Client Deleted",client:client})
}

export const updateClient = async (req,res,next) => {
    const user = req.user;
    if(!user){
        return next(new AppError("User does not exist!"),401);
    }
    const allowedUserFields = ["userName", "phoneNumber", "password"];
    const allowedClientFields = ["businessName"];

    let userData = _.pickBy(_.pick(req.body, allowedUserFields), _.identity);
    let clientData = _.pickBy(_.pick(req.body, allowedClientFields), _.identity);

    if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 10);
    }

    if (_.isEmpty(userData) && _.isEmpty(clientData)) {
        return next(new AppError("No valid fields provided for update.",404))

    }
    const client = await clientModel.findByPk(user.id);
    await user.update(userData);
    await client.update(clientData)

    return res.status(200).json({
        message: "Client updated successfully",
        data: { ...userData, ...clientData }
    });

}