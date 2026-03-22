import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { register } from "../controllers/register";
import { login } from "../controllers/login";
import { verifyOtp, resendOtp } from "../controllers/otp";
import { getMe, logout } from "../controllers/session";
import {
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/password";

const router = Router();

router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.get("/me", authMiddleware, getMe);
router.post("/logout", authMiddleware, logout);
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPassword);

export default router;
