import { Request, Response } from "express";
import logger from "../config/logger";
import { User } from "../models/User.model";
import { generateOTP, verifyOTP } from "../services/otp.service";
import { sendOTPEmail } from "../services/email.service";
import { createSession } from "../services/session.service";
import { redis } from "../config/redis";
import { COOKIE_OPTIONS } from "./cookies";
import { blockchainService } from "../services/blockchain.service";
import { env } from "../config/env";

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ error: "Email and OTP are required." });
      return;
    }

    const result = await verifyOTP(email, otp, "verify");
    if (!result.valid) {
      res.status(400).json({ error: result.reason });
      return;
    }

    const user = await User.findOneAndUpdate(
      { email, status: "unverified" },
      { status: "verified" },
      { new: true },
    );

    if (!user) {
      res.status(404).json({ error: "User not found or already verified." });
      return;
    }

    const initialGrantBlock = blockchainService.chain.grantInitialTokens(
      user.walletAddress,
      env.initialVelGrant,
      {
        reason: "INITIAL_USER_GRANT",
        userId: user._id.toString(),
      },
    );
    await blockchainService.persistBlock(initialGrantBlock);

    const token = await createSession(
      user._id.toString(),
      user.walletAddress,
      user.role,
    );

    // Retrieve wallet secrets (shown once, then deleted)
    const secretsRaw = await redis.get(`wallet-secrets:${user._id}`);
    let walletSecrets = null;
    if (secretsRaw) {
      walletSecrets = JSON.parse(secretsRaw);
      await redis.del(`wallet-secrets:${user._id}`);
    }

    res.cookie("token", token, COOKIE_OPTIONS);

    res.json({
      message: "Email verified successfully.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
      },
      walletSecrets,
    });
  } catch (error) {
    logger.error("[Verify OTP Error]", { error });
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
}

export async function resendOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email, purpose } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required." });
      return;
    }

    const otpPurpose = purpose === "reset" ? "reset" : "verify";

    const user = await User.findOne({ email });
    if (!user) {
      res.json({ message: "If the email exists, a new OTP has been sent." });
      return;
    }

    const otp = await generateOTP(email, otpPurpose as "verify" | "reset");
    await sendOTPEmail(email, otp, otpPurpose as "verify" | "reset");

    res.json({ message: "If the email exists, a new OTP has been sent." });
  } catch (error) {
    logger.error("[Resend OTP Error]", { error });
    res.status(500).json({ error: "Failed to resend OTP." });
  }
}
