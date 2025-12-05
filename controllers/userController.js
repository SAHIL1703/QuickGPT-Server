import User from "../models/User.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Chat from "../models/Chat.js";

//Generate JWT Token
const generateJWTToken = (id) => {
    const secret = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev_secret' : null);
    if (!secret) {
        throw new Error('JWT_SECRET is not set in environment');
    }
    return jwt.sign({ id }, secret, { expiresIn: '30d' });
}

//Api to Register User
export const registerUser = async (req, res) => {
    const { email, name, password } = req.body;
    try {
        if (!email || !name || !password) {
            return res.status(400).json({ success: false, message: 'Name, email and password are required' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(409).json({ success: false, message: 'User already exists' });
        }

        const user = await User.create({ name, email, password });

        const token = generateJWTToken(user._id);

        return res.status(201).json({ success: true, message: 'User registered', token });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

//Api to login User
export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                const token = generateJWTToken(user._id);
                return res.json({ success: true, message: 'Login successful', token });
            }
        }
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

//Api to get User Data
export const getUserData = async (req, res) => {
    try {
        const user = req.user;
        return res.json({ success: true, user });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}


//API to get Published Image
export const getPublishedImages = async(req,res)=>{
    try {
        const publishedImageMessages = await Chat.aggregate([
            {$unwind : "$messages"},
            {
                $match : {
                    "messages.isImage" : true,
                    "messages.isPublished" : true
                }
            },
            {
                $project : {
                    _id : 0,
                    imageUrl : "$messages.content",
                    userName : "$userName" 
                }
            }
        ]);

        res.json({success : true , images : publishedImageMessages.reverse()})
    } catch (error) {
        res.json({success:false , message : error.message})
    }
}