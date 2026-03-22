import crypto from "crypto";
import { redis } from "../config/redis";
import { env } from "../config/env";

// Generate a 6-digit OTP and store in Redis
export async function generateOTP(email: string, purpose: "verify" | "reset"): Promise<string> {
  const otp = crypto.randomInt(100000, 999999).toString();
  const key = `${purpose}:${email}`;

  await redis.setex(key, env.otpExpirySeconds, otp);
  await redis.del(`attempts:${purpose}:${email}`);

  return otp;
}

// Verify OTP against Redis. Locks out after 5 failed attempts.
export async function verifyOTP(
  email: string,
  otp: string,
  purpose: "verify" | "reset"
): Promise<{ valid: boolean; reason?: string }> {
  const attemptsKey = `attempts:${purpose}:${email}`;

  const attempts = await redis.get(attemptsKey);
  if (attempts && parseInt(attempts) >= 5) {
    return { valid: false, reason: "Too many failed attempts. Request a new OTP." };
  }

  const key = `${purpose}:${email}`;
  const storedOTP = await redis.get(key);

  if (!storedOTP) {
    return { valid: false, reason: "OTP expired or not found. Request a new one." };
  }

  if (storedOTP !== otp) {
    await redis.incr(attemptsKey);
    await redis.expire(attemptsKey, 900);
    return { valid: false, reason: "Invalid OTP." };
  }

  // Valid — clean up
  await redis.del(key);
  await redis.del(attemptsKey);

  return { valid: true };
}
