import { Request, Response } from "express";
import crypto from "crypto";
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
  let lockKey = "";
  let lockToken = "";
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ error: "Email and OTP are required." });
      return;
    }

    lockKey = `otp-verify-lock:${email}`;
    lockToken = crypto.randomUUID();
    const lockAcquired = await redis.set(lockKey, lockToken, "EX", 15, "NX");
    if (!lockAcquired) {
      res.status(409).json({
        error: "Verification already in progress. Please retry in a moment.",
      });
      return;
    }

    const preUser = await User.findOne({ email }).select("_id status").lean();
    if (!preUser) {
      logger.warn("[Verify OTP Missing User]", { email });
      res.status(404).json({ error: "User not found." });
      return;
    }

    let user = null;
    let didJustVerify = false;

    if (preUser.status === "verified") {
      user = await User.findById(preUser._id);
      if (!user) {
        logger.warn("[Verify OTP Already Verified But User Missing]", {
          email,
          userId: String(preUser._id),
        });
        res.status(404).json({ error: "User not found." });
        return;
      }
      logger.info("[Verify OTP Idempotent Success]", {
        email,
        userId: String(user._id),
      });
    } else {
      const result = await verifyOTP(email, otp, "verify");
      if (!result.valid) {
        res.status(400).json({ error: result.reason });
        return;
      }

      user = await User.findOneAndUpdate(
        { _id: preUser._id, status: "unverified" },
        {
          $set: {
            status: "verified",
            otpVerifiedAt: new Date(),
            otpExpiresAt: null,
          },
        },
        { new: true },
      );

      if (!user) {
        const maybeNowVerified = await User.findById(preUser._id)
          .select("status")
          .lean();
        if (maybeNowVerified?.status === "verified") {
          const existingVerified = await User.findById(preUser._id);
          if (!existingVerified) {
            res.status(404).json({ error: "User not found." });
            return;
          }
          user = existingVerified;
        } else {
          logger.warn("[Verify OTP User Missing During Update]", {
            email,
            userId: String(preUser._id),
          });
          res.status(404).json({ error: "User not found." });
          return;
        }
      } else {
        didJustVerify = true;
      }
    }

    if (didJustVerify) {
      try {
        await blockchainService.grantInitialTokensAtomic(
          user.walletAddress,
          env.initialVelGrant,
          {
            reason: "INITIAL_USER_GRANT",
            userId: user._id.toString(),
          },
        );
      } catch (grantError) {
        // Verification success should not fail user login redirect.
        logger.error("[Verify OTP Initial Grant Failed]", {
          email,
          userId: String(user._id),
          error: grantError,
        });
      }
      logger.info("[Auth OTP Verified]", {
        email,
        userId: String(user._id),
        verifiedAt: user.otpVerifiedAt?.toISOString(),
        createdAt: user.createdAt.toISOString(),
      });
    }

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
      message: didJustVerify
        ? "Email verified successfully."
        : "Email already verified. Logged in successfully.",
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
  } finally {
    if (lockKey && lockToken) {
      const currentToken = await redis.get(lockKey);
      if (currentToken === lockToken) {
        await redis.del(lockKey);
      }
    }
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

    const user = await User.findOne({ email }).select("_id status createdAt");
    if (!user) {
      res.json({ message: "If the email exists, a new OTP has been sent." });
      return;
    }

    if (otpPurpose === "verify" && user.status === "verified") {
      logger.info("[Resend OTP Ignored Already Verified]", {
        email,
        userId: String(user._id),
      });
      res.json({ message: "If the email exists, a new OTP has been sent." });
      return;
    }

    const otpResult = await generateOTP(email, otpPurpose as "verify" | "reset");
    if (!otpResult.ok) {
      res.status(429).json({
        error: otpResult.reason,
        retryAfterSeconds: otpResult.waitSeconds,
      });
      return;
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          lastOtpSentAt: otpResult.sentAt,
          otpExpiresAt: otpResult.expiresAt,
          lastOtpPurpose: otpPurpose,
        },
      },
    );

    logger.info("[Auth OTP Resent]", {
      email,
      userId: String(user._id),
      purpose: otpPurpose,
      sentAt: otpResult.sentAt.toISOString(),
      expiresAt: otpResult.expiresAt.toISOString(),
    });

    await sendOTPEmail(email, otpResult.otp, otpPurpose as "verify" | "reset");

    res.json({ message: "If the email exists, a new OTP has been sent." });
  } catch (error) {
    logger.error("[Resend OTP Error]", { error });
    res.status(500).json({ error: "Failed to resend OTP." });
  }
}
