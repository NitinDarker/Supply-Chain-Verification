import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/auth.middleware";
import {
  authLimiter,
  registerLimiter,
  otpLimiter,
} from "../middleware/rateLimiter.middleware";
import { register } from "../controllers/register";
import { login } from "../controllers/login";
import { verifyOtp, resendOtp } from "../controllers/otp";
import { getMe, logout } from "../controllers/session";
import {
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/password";
import { createAdmin } from "../controllers/admin";
import {
  validateWith,
  validateCreateAdminInput,
  validateLoginInput,
  validateRegisterInput,
  validateResendOtpInput,
  validateResetPasswordInput,
  validateVerifyOtpInput,
} from "../middleware/input.security";

const router = Router();

router.post("/register", registerLimiter, validateWith(validateRegisterInput), register);
router.post("/signup", registerLimiter, validateWith(validateRegisterInput), register);
router.post("/verify-otp", otpLimiter, validateWith(validateVerifyOtpInput), verifyOtp);
router.post("/login", authLimiter, validateWith(validateLoginInput), login);
router.post("/resend-otp", otpLimiter, validateWith(validateResendOtpInput), resendOtp);
router.get("/me", authMiddleware, getMe);
router.post("/logout", authMiddleware, logout);
router.post("/forgot-password", otpLimiter, validateWith(validateResendOtpInput), forgotPassword);
router.post("/verify-reset-otp", otpLimiter, validateWith(validateVerifyOtpInput), verifyResetOtp);
router.post("/reset-password", authLimiter, validateWith(validateResetPasswordInput), resetPassword);
router.post(
  "/_internal/admins",
  authLimiter,
  authMiddleware,
  validateWith(validateCreateAdminInput),
  createAdmin,
);

export default router;
