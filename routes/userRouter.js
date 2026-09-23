import express from 'express';
import {
    createUser,
    loginUser,
    getCurrentUser,
    updateCurrentUser,
    getUsers,
    updateUserStatus,
    updateUserRole,
} from '../controllers/userController.js';
import { sendOtp, verifyOtp, resendOtp } from '../controllers/otpController.js';

const userRouter = express.Router();
userRouter.post("/", createUser);
userRouter.post("/login", loginUser);
userRouter.post("/send-otp", sendOtp);
userRouter.post("/verify-otp", verifyOtp);
userRouter.post("/resend-otp", resendOtp);
userRouter.get("/me", getCurrentUser);
userRouter.put("/me", updateCurrentUser);
userRouter.get("/", getUsers);
userRouter.put("/:userId/status", updateUserStatus);
userRouter.patch("/:userId/role", updateUserRole);

export default userRouter;
