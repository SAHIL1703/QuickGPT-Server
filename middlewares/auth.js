import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    try {
        let token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({ success: false, message: 'No token provided' });
        }

        // Support 'Bearer <token>' header or raw token
        if (token.startsWith('Bearer ')) {
            token = token.split(' ')[1];
        }

        const secret = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev_secret' : null);
        if (!secret) {
            return res.status(500).json({ success: false, message: 'JWT_SECRET not configured on server' });
        }

        const decoded = jwt.verify(token, secret);
        const userId = decoded.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized access' });
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Unauthorized access' });
    }
}