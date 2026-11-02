import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    let token;

    if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');
            if (!user) {
                res.status(401);
                res.clearCookie('jwt', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV !== 'development',
                    sameSite: 'lax',
                });
                return next(new Error('User account not found. Please log in again.'));
            }
            req.user = user;
            return next();
        } catch (error) {
            res.status(401);
            res.clearCookie('jwt', {
                httpOnly: true,
                secure: process.env.NODE_ENV !== 'development',
                sameSite: 'lax',
            });
            if (error.name === 'TokenExpiredError') {
                return next(new Error('Session expired. Please log in again.'));
            }
            if (error.name === 'JsonWebTokenError') {
                return next(new Error('Invalid authorization token. Please log in again.'));
            }
            return next(new Error(error.message || 'Not authorized, token failed'));
        }
    } else {
        res.status(401);
        return next(new Error('Not authorized, please log in'));
    }
};

// Admin and Manager role authorization middleware
export const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403);
            return next(new Error(`User role ${req.user ? req.user.role : 'Unknown'} is not authorized to access this route`));
        }
        next();
    };
};
