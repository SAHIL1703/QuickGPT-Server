import express from 'express';
import { getUserData, loginUser, registerUser ,getPublishedImages } from '../controllers/userController.js';
import { protect } from '../middlewares/auth.js';
const userRouter = express.Router();

userRouter.post('/register' , registerUser);
userRouter.post('/login' , loginUser);
userRouter.get('/data' , protect , getUserData);
userRouter.get('/published-images' , protect , getPublishedImages);

export default userRouter;
