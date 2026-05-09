import crypto from "crypto";
import { redis } from "../config/redis";
import { env } from "../config/env";

type OtpPurpose = "verify" | "reset";

type OtpIssueSuccess = {
  ok: true;
  otp: string;
  sentAt: Date;
  expiresAt: Date;
};

type OtpIssueFailure = {
  ok: false;
  reason: string;
  waitSeconds?: number;
};

export type OtpIssueResult = OtpIssueSuccess | OtpIssueFailure;

function otpKey(email: string, purpose: OtpPurpose): string {
  return `${purpose}:${email}`;
}

function otpAttemptsKey(email: string, purpose: OtpPurpose): string {
  return `attempts:${purpose}:${email}`;
}

function otpCooldownKey(email: string, purpose: OtpPurpose): string {
  return `otp-cooldown:${purpose}:${email}`;
}

function otpMetaKey(email: string, purpose: OtpPurpose): string {
  return `otp-meta:${purpose}:${email}`;
}

// Generate a 6-digit OTP and store in Redis.
// Includes per-email cooldown to prevent abuse across IP addresses.
export async function generateOTP(
  email: string,
  purpose: OtpPurpose,
  options?: { enforceCooldown?: boolean },
): Promise<OtpIssueResult> {
  const enforceCooldown = options?.enforceCooldown ?? true;
  const cooldownKey = otpCooldownKey(email, purpose);

  if (enforceCooldown) {
    const lock = await redis.set(
      cooldownKey,
      "1",
      "EX",
      env.otpResendCooldownSeconds,
      "NX",
    );
    if (!lock) {
      const waitSeconds = Math.max(await redis.ttl(cooldownKey), 1);
      return {
        ok: false,
        reason: "OTP requested too recently. Please wait before retrying.",
        waitSeconds,
      };
    }
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const sentAt = new Date();
  const expiresAt = new Date(sentAt.getTime() + env.otpExpirySeconds * 1000);
  const key = otpKey(email, purpose);

  await redis.setex(key, env.otpExpirySeconds, otp);
  await redis.del(otpAttemptsKey(email, purpose));
  await redis.setex(
    otpMetaKey(email, purpose),
    env.otpExpirySeconds,
    JSON.stringify({
      sentAt: sentAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }),
  );

  return { ok: true, otp, sentAt, expiresAt };
}

// Verify OTP against Redis. Locks out after a configured number of failed attempts.
export async function verifyOTP(
  email: string,
  otp: string,
  purpose: OtpPurpose,
): Promise<{ valid: boolean; reason?: string }> {
  const attemptsKey = otpAttemptsKey(email, purpose);

  const attempts = Number(await redis.get(attemptsKey) || "0");
  if (attempts >= env.otpMaxVerifyAttempts) {
    return { valid: false, reason: "Too many failed attempts. Request a new OTP." };
  }

  const key = otpKey(email, purpose);
  const storedOTP = await redis.get(key);

  if (!storedOTP) {
    return { valid: false, reason: "OTP expired or not found. Request a new one." };
  }

  if (storedOTP !== otp) {
    const nextAttempts = await redis.incr(attemptsKey);
    if (nextAttempts === 1) {
      await redis.expire(attemptsKey, Math.max(env.otpExpirySeconds, 900));
    }

    if (nextAttempts >= env.otpMaxVerifyAttempts) {
      return {
        valid: false,
        reason: "Too many failed attempts. Request a new OTP.",
      };
    }

    return { valid: false, reason: "Invalid OTP." };
  }

  // Valid — clean up
  await redis.del(key);
  await redis.del(attemptsKey);
  await redis.del(otpCooldownKey(email, purpose));
  await redis.del(otpMetaKey(email, purpose));

  return { valid: true };
}
