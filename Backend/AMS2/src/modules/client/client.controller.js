

export const googleAuthCallback = async (req, res, next) => {
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

    // Find existing user in the database
    let existingUser = await userModel.findOne({ email: decodedIdToken.email });

    if (!existingUser) {
        return next(new AppError("User not found. Please sign up first.", 404));
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

    // Generate JWT token for user authentication
    const token = jwt.sign(
        {
            id: existingUser._id,
            userName: existingUser.userName,
            email: existingUser.email,
            role: existingUser.roleId,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" } // Set token expiration
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