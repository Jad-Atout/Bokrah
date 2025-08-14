import userModel from "../../DB/models/user.js";
import {AppError} from "../utils/AppError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import roleModel from "../../DB/models/role.js";
import clientModel from "../../DB/models/client.js";
import customerModel from "../../DB/models/customer.js";
import staffModel from "../../DB/models/staff.js";
import websiteModel from "../../DB/models/website.js";
import { config } from "dotenv";

config();

export const generalLogin = (async (req, res) => {
    const { identifier, password } = req.body;

    const isEmail = identifier.includes("@");
    const query = isEmail
        ? { email: identifier.toLowerCase() }
        : { phoneNumber: identifier };

    const user = await userModel.findOne(query).lean();
    if (!user) throw new AppError("User not found", 404);
    if (!user.confirmed) throw new AppError("User isn’t confirmed", 403);
    if (user.authProvider !== "local")
        throw new AppError("User must change password (social login)", 403);

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new AppError("Wrong password", 401);

    const role = await roleModel.findById(user.roleId).lean();
    const tokenData = {
        id: user._id,
        userName: user.userName,
        role,
    };

    if (role?.client) {
        const client = await clientModel.findOne({ userId: user._id }).lean();
        const website = await websiteModel.findOne({ clientId: client._id }).lean();
        if (!website) throw new AppError("Website info not found", 404);
        Object.assign(tokenData, {
            businessName: website.businessName,
            industry: website.industry,
            clientId: client._id,
        });
    }

    if (role?.customer) {
        const customer = await customerModel.findOne({ userId: user._id }).lean();
        tokenData.customerId = customer._id;
    }

    if (role?.staff) {
        const staff = await staffModel.findOne({ userId: user._id }).lean();
        Object.assign(tokenData, {
            staffId: staff._id,
            roleDescription: staff.roleDescription,
            availability: staff.availability,
        });
    }

    const token = jwt.sign(tokenData, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
    const accessToken = jwt.sign(tokenData,process.env.ACCESS_TOKEN_SECRET,{
        expiresIn: "3600s"
    })
    const refreshToken = jwt.sign('7d')

    res.cookie('jwt',refreshToken,{httpOnly: true, maxAge:7 * (24 * 60 * 60 * 1000)})

    res.status(200).json({
        message: "Login successful",
        token,
        user: tokenData,
        accessToken
    });
});
