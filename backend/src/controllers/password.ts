import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { generateOTP, verifyOTP } from "../services/otp.service";
import { sendOTPEmail } from "../services/email.service";
import { destroyAllUserSessions } from "../services/session.service";
import { redis } from "../config/redis";
import { v4 as uuidv4 } from "uuid";

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required." });
      return;
    }

    const user = await User.findOne({ email });
    if (user) {
      const otp = await generateOTP(email, "reset");
      await sendOTPEmail(email, otp, "reset");
    }

    res.json({ message: "If the email is registered, a reset code has been sent." });
  } catch (error) {
    console.error("[Forgot Password Error]:", error);
    res.status(500).json({ error: "Failed to process request." });
  }
}

export async function verifyResetOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ error: "Email and OTP are required." });
      return;
    }

    const result = await verifyOTP(email, otp, "reset");
    if (!result.valid) {
      res.status(400).json({ error: result.reason });
      return;
    }

    const resetToken = uuidv4();
    await redis.setex(`reset-token:${email}`, 600, resetToken);

    res.json({ message: "OTP verified.", resetToken });
  } catch (error) {
    console.error("[Verify Reset OTP Error]:", error);
    res.status(500).json({ error: "Verification failed." });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      res.status(400).json({ error: "Email, reset token, and new password are required." });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters." });
      return;
    }

    const storedToken = await redis.get(`reset-token:${email}`);
    if (!storedToken || storedToken !== resetToken) {
      res.status(400).json({ error: "Invalid or expired reset token." });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findOneAndUpdate({ email }, { password: hashedPassword });

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    await redis.del(`reset-token:${email}`);
    await destroyAllUserSessions(user._id.toString());

    res.json({ message: "Password reset successful. Please log in with your new password." });
  } catch (error) {
    console.error("[Reset Password Error]:", error);
    res.status(500).json({ error: "Password reset failed." });
  }
}
