import { Request, Response } from "express";
import logger from "../config/logger";
import bcrypt from "bcryptjs";
import { User } from "../models/User.model";
import { generateWallet } from "../services/wallet.service";
import { generateOTP } from "../services/otp.service";
import { sendOTPEmail } from "../services/email.service";
import { redis } from "../config/redis";

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({
        error: "Username, email, and password are required.",
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        error: "Password must be at least 6 characters.",
      });
      return;
    }

    const allowedRoles = ["manufacturer", "distributor", "retailer", "user"];
    if (!allowedRoles.includes(role)) {
      res.status(400).json({
        error: "Given role does not exist.",
      });
      return;
    }

    const userRole = role;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existingUser) {
      const field = existingUser.email === email ? "Email" : "Username";
      res.status(409).json({
        error: `${field} already exists.`,
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const wallet = generateWallet();

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: userRole,
      status: "unverified",
      walletAddress: wallet.walletAddress,
      publicKey: wallet.publicKey,
      encryptedPrivateKey: wallet.encryptedPrivateKey,
    });

    const otpResult = await generateOTP(email, "verify", {
      enforceCooldown: false,
    });
    if (!otpResult.ok) {
      logger.error("[Register OTP Generation Error]", {
        email,
        reason: otpResult.reason,
      });
      await User.deleteOne({ _id: user._id });
      res.status(500).json({ error: "Registration failed. Please try again." });
      return;
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          lastOtpSentAt: otpResult.sentAt,
          otpExpiresAt: otpResult.expiresAt,
          lastOtpPurpose: "verify",
        },
      },
    );

    logger.info("[Auth OTP Issued]", {
      email,
      userId: user._id,
      purpose: "verify",
      createdAt: user.createdAt.toISOString(),
      sentAt: otpResult.sentAt.toISOString(),
      expiresAt: otpResult.expiresAt.toISOString(),
    });

    await sendOTPEmail(email, otpResult.otp, "verify");

    // Store wallet secrets temporarily — shown once after OTP verification
    await redis.setex(
      `wallet-secrets:${user._id}`,
      600,
      JSON.stringify({
        mnemonic: wallet.mnemonic,
        privateKey: wallet.privateKey,
      }),
    );

    res.status(201).json({
      message: "Registration successful. OTP sent to your email.",
      email,
    });
  } catch (error) {
    logger.error("[Register Error]", { error });
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
}

