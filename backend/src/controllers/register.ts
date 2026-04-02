import { Request, Response } from "express";
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

    const otp = await generateOTP(email, "verify");
    await sendOTPEmail(email, otp, "verify");

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
    console.error("[Register Error]:", error);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
}

