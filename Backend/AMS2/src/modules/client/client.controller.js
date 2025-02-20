import GoogleAuthService from "../../ults/Google/Services/googleAuth.js";
import jwt from "jsonwebtoken";
import {AppError} from "../../ults/AppError.js";
import userModel from "../../../DB/models/user.js"
import googleModel from "../../../DB/models/GoogleCalendar.js"
import roleModel from "../../../DB/models/role.js"
import clientModel from "../../../DB/models/client.js"


export const googleAuthCallback = async (req, res, next) => {
    const {businessName,industry} = req.body;
    const authService = new GoogleAuthService();
    const { code } = req.query;
    if (!code) {
        return next(new AppError("Authorization code is missing from the callback.", 400));
    }
    const tokens = await authService.handleOAuthRedirect(code);
    const { idToken, access_token, refresh_token } = tokens;
    const decodedIdToken = jwt.decode(idToken);
    if (!decodedIdToken || !decodedIdToken.email) {
        return next(new AppError("Failed to retrieve user information from Google.", 400));
    }
    // Find existing user in the
    // database
    let role = null
    let existingUser = await userModel.findOne({ email: decodedIdToken.email });
    if(!existingUser){
            role = await roleModel.create({
            admin: false,
            client: true,
            staff: false,
            customer: false
        })
        existingUser = new userModel({
            userName:decodedIdToken.name,
            email: decodedIdToken.email,
            password: null, // No password for Google-authenticated users
            authProvider: "google",
            confirmed:decodedIdToken.email_verified,
            roleId:role._id
        })
        await existingUser.save()
        const client = await clientModel.create({
            userId:existingUser._id,
         //   businessName:businessName,
           // industry:industry
        })


    }
    // Find or create a record in googleModel for the user
    let googleCredentials = await googleModel.findOne({ clientId: existingUser._id });
    if (!googleCredentials) {
        googleCredentials = new googleModel({
            clientId: existingUser._id,
            refreshToken: refresh_token,
            accessToken: access_token,
        });
        await googleCredentials.save();
    } else {
        // If already exists, update the refreshToken/accessToken
        googleCredentials.refreshToken = refresh_token;
        googleCredentials.accessToken = access_token;
        await googleCredentials.save();
    }
         role = await  roleModel.findById(existingUser.roleId)
    // Generate JWT token for user authentication
    const token = jwt.sign(
        {
            id: existingUser._id,
            userName: existingUser.userName,
            email: existingUser.email,
            role: role ? role.toObject() : null
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" } // Set token expiration
    );

    const decoded = jwt.decode(token);



    return res.status(200).json({
        message: "Google authentication successful.",
        token,
        decoded,
        googleCredentials
    });

};
export const gClientLogin = async (req, res) => {
    const authService = new GoogleAuthService();
    const authUrl = authService.generateAuthUrl();

    return res.redirect(authUrl);
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

