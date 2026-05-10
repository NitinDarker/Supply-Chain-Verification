import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import logger from "../config/logger";
import { env } from "../config/env";
import { User } from "../models/User.model";
import { generateWallet } from "../services/wallet.service";
import { blockchainService } from "../services/blockchain.service";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function createAdmin(req: Request, res: Response): Promise<void> {
  try {
    // if (!env.adminCreateKey) {
    //   logger.error("[Admin Create] ADMIN_CREATE_KEY not configured");
    //   res
    //     .status(503)
    //     .json({ error: "Admin creation is disabled by server configuration." });
    //   return;
    // }

    // const providedKey = req.header("x-internal-admin-key") || "";
    // if (!safeEqual(providedKey, env.adminCreateKey)) {
    //   logger.warn("[Admin Create] Invalid internal key", {
    //     requestedBy: req.user?.userId,
    //     ip: req.ip,
    //   });
    //   res.status(403).json({ error: "Forbidden." });
    //   return;
    // }

    const { username, email, password } = req.body as {
      username: string;
      email: string;
      password: string;
    };

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    }).lean();
    if (existingUser) {
      const field = existingUser.email === email ? "Email" : "Username";
      res.status(409).json({ error: `${field} already exists.` });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const wallet = generateWallet();

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: "admin",
      status: "verified",
      otpVerifiedAt: new Date(),
      walletAddress: wallet.walletAddress,
      publicKey: wallet.publicKey,
      encryptedPrivateKey: wallet.encryptedPrivateKey,
    });

    try {
      await blockchainService.grantInitialTokensAtomic(
        wallet.walletAddress,
        env.initialVelGrant,
        {
          reason: "ADMIN_CREATED",
          userId: String(user._id),
          createdBy: req.user?.userId ?? "unknown",
        },
      );
    } catch (grantError) {
      await User.deleteOne({ _id: user._id });
      logger.error("[Admin Create] Initial grant failed, rolled back user", {
        userId: String(user._id),
        email,
        error: grantError,
      });
      res.status(500).json({ error: "Failed to fund admin wallet." });
      return;
    }

    logger.info("[Admin Create] Admin created successfully", {
      createdAdminId: String(user._id),
      createdBy: req.user?.userId,
      email,
      walletAddress: user.walletAddress,
    });

    res.status(201).json({
      message: "Admin account created successfully.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
      },
    });
  } catch (error) {
    logger.error("[Admin Create] Error", { error });
    res.status(500).json({ error: "Failed to create admin." });
  }
}
