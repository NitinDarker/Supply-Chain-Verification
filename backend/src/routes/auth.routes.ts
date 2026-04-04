import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  authLimiter,
  registerLimiter,
  otpLimiter,
} from "../middleware/rateLimiter.middleware";
import { validate } from "../middleware/validate";
import { register } from "../controllers/register";
import { login } from "../controllers/login";
import { verifyOtp, resendOtp } from "../controllers/otp";
import { getMe, logout } from "../controllers/session";
import {
  registerSchema,
  loginSchema,
  otpSchema,
} from "../validators/auth.validator";
import {
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/password";

const router = Router();

router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/verify-otp", otpLimiter, validate(otpSchema), verifyOtp);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/resend-otp", otpLimiter, resendOtp);
router.get("/me", authMiddleware, getMe);
router.post("/logout", authMiddleware, logout);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/verify-reset-otp", otpLimiter, verifyResetOtp);
router.post("/reset-password", authLimiter, resetPassword);

export default router;
