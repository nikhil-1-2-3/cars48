import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/email.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to generate OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper to send OTP
const sendOTP = async (user) => {
    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    console.log(`\n========================================`);
    console.log(`🔐 DEVELOPMENT OTP FOR ${user.email}: ${otp}`);
    console.log(`========================================\n`);

    let emailResult = null;
    try {
        emailResult = await sendEmail({
            email: user.email,
            subject: 'FleetFlow - Your Verification Code',
            message: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
            html: `
                <div style="font-family: Arial, sans-serif; background: #09090b; color: #ffffff; padding: 40px; border-radius: 12px; max-width: 500px; margin: auto;">
                    <h2 style="letter-spacing: 2px; text-transform: uppercase; color: #ffffff;">FleetFlow Verification</h2>
                    <p style="color: #a1a1aa; font-size: 14px;">Your 6-digit authorization code is below:</p>
                    <div style="background: #18181b; border: 1px solid #27272a; padding: 20px; text-align: center; border-radius: 8px; margin: 24px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #10b981;">${otp}</span>
                    </div>
                    <p style="color: #71717a; font-size: 12px;">This code will expire in 10 minutes. If you did not request this, please disregard this email.</p>
                </div>
            `,
        });
    } catch (error) {
        console.error('Email could not be sent. Please use the console OTP.', error);
    }
    return emailResult;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, phone } = req.body;

        const userExists = await User.findOne({ email });

        if (userExists) {
            res.status(400);
            throw new Error('User already exists');
        }

        const user = await User.create({
            name,
            email,
            password,
            phone,
            isVerified: false
        });

        if (user) {
            const emailResult = await sendOTP(user);
            res.status(201).json({
                message: 'Registration successful. OTP sent to email.',
                email: user.email,
                requiresOTP: true,
                devOTP: user.otp,
                emailPreviewUrl: emailResult?.previewUrl || null,
            });
        } else {
            res.status(400);
            throw new Error('Invalid user data');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            if (!user.isVerified) {
                const emailResult = await sendOTP(user);
                return res.status(200).json({
                    message: 'Account not verified. OTP sent to email.',
                    email: user.email,
                    requiresOTP: true,
                    devOTP: user.otp,
                    emailPreviewUrl: emailResult?.previewUrl || null,
                });
            }

            const token = generateToken(res, user._id);
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token,
            });
        } else {
            res.status(401);
            throw new Error('Invalid email or password');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res, next) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            res.status(400);
            throw new Error('Invalid or expired OTP');
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        const token = generateToken(res, user._id);
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Google Login
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = async (req, res, next) => {
    try {
        const { tokenId } = req.body;
        // Mock verification if NO client ID is provided yet, otherwise verify
        let email, name, googleId;
        
        if (process.env.GOOGLE_CLIENT_ID === 'mocked_google_client_id') {
             // Mock data for testing without actual frontend Google OAuth provider
             email = req.body.email || 'mockuser@gmail.com';
             name = req.body.name || 'Mock Google User';
             googleId = 'mock_g_id_123';
        } else {
            const ticket = await client.verifyIdToken({
                idToken: tokenId,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            email = payload.email;
            name = payload.name;
            googleId = payload.sub;
        }

        let user = await User.findOne({ email });

        if (user) {
            // If user exists, log them in
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
            const token = generateToken(res, user._id);
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token,
            });
        } else {
            // Create new user
            user = await User.create({
                name,
                email,
                googleId,
                role: 'customer' // default role
            });
            const token = generateToken(res, user._id);
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token,
            });
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
export const logoutUser = (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0),
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                licenseUrl: user.licenseUrl
            });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.phone = req.body.phone || user.phone;
            user.licenseUrl = req.body.licenseUrl || user.licenseUrl;

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone,
                licenseUrl: updatedUser.licenseUrl
            });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Request password change (sends OTP)
// @route   POST /api/auth/profile/request-password-change
// @access  Private
export const requestPasswordChange = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            await sendOTP(user);
            res.status(200).json({
                message: 'OTP sent to your email',
                email: user.email,
                devOTP: user.otp
            });
        } else {
            res.status(404);
            throw new Error('User not found');
        }
    } catch (error) {
        next(error);
    }
};

// @desc    Verify OTP and update password
// @route   PUT /api/auth/profile/password
// @access  Private
export const verifyPasswordChange = async (req, res, next) => {
    try {
        const { otp, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            res.status(400);
            throw new Error('Invalid or expired OTP');
        }

        user.password = newPassword;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        next(error);
    }
};
