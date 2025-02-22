import GoogleAuthService from "../../utils/Google/googleAuth.js";
import jwt from "jsonwebtoken";
import {AppError} from "../../utils/AppError.js";
import userModel from "../../../DB/models/user.js"
import googleModel from "../../../DB/models/GoogleCalendar.js"
import roleModel from "../../../DB/models/role.js"
import clientModel from "../../../DB/models/client.js"
import {createRole} from "../../../DB/Controller/role.controller.js";
import {transCreateCustomer} from "../../../DB/Controller/customer.DB.controller.js";


import mongoose from "mongoose";

export const googleAuthCallback = async (req, res, next) => {
    const session = await mongoose.startSession(); // Start a session
    session.startTransaction();

    try {
        const authService = new GoogleAuthService();
        const { code, state } = req.query;
        const formData = state ? JSON.parse(decodeURIComponent(state)) : {};
        const { businessName, industry } = formData;

        if (!code) {
            return next(new AppError("Authorization code is missing from the callback.", 400));
        }

        const { idToken, access_token, refresh_token } = await authService.handleOAuthRedirect(code);
        const decodedIdToken = jwt.decode(idToken);

        let user = await userModel.findOne({ email: decodedIdToken.email }).session(session);

        if (!user) {
            const role = await createRole({ client: true }, session); // Creating the role

            user = await transCreateCustomer({
                userName: decodedIdToken.name,
                email: decodedIdToken.email,
                password: null, // No password for Google-authenticated users
                authProvider: "google",
                confirmed: decodedIdToken.email_verified,
                roleId: role._id
            }, session);

            await clientModel.create([{ userId: user._id, industry, businessName }], { session });

        }
        const role = await roleModel.findOne({ _id: user.roleId }).session(session);
        const client = await clientModel.findOne({userId:user._id}).session(session);
        await googleModel.findOneAndUpdate({ clientId: client._id }, { refreshToken: refresh_token, accessToken: access_token }, { new: true, upsert: true, session }).session(session);

        await session.commitTransaction();
        session.endSession();

        const token = jwt.sign(
            {
                id: user._id,
                userName: user.userName,
                email: user.email,
                role: role ? role.toObject() : null, // Ensure role is assigned here
                businessName,
                industry,
                clientId: client._id,
            },
            process.env.JWT_SECRET,
        );

        return res.status(200).json({
            message: "Google authentication successful.",
            token,
            decoded: jwt.decode(token),
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(new AppError(error, 500));
    }
};

export const gClientLogin = async (req, res) => {
    const { businessName, industry } = req.query;  // Get params from the request
    if (!businessName || !industry) {
        return res.status(400).json({ error: "Missing businessName or industry" });
    }
    const authService = new GoogleAuthService();
    const authUrl = authService.generateAuthUrl();
    const modifiedAuthUrl = `${authUrl}&state=${encodeURIComponent(JSON.stringify({ businessName, industry }))}`;
    return res.redirect(modifiedAuthUrl);
};



export const clientLogin = async (req, res,next) => {
    const user_ = req.user;
    if(!user_){
        return next(new AppError("User does not exist!"),409);
    }
    const {password} = req.body

    if(user_.role!='Client'){
        return next(new AppError("You're not a Service Provider",401))
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

