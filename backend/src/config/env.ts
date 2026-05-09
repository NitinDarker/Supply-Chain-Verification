import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/velen",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  jwtSecret: process.env.JWT_SECRET || "velen-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "24h",
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  otpExpirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS || "300", 10),
  otpResendCooldownSeconds: parseInt(
    process.env.OTP_RESEND_COOLDOWN_SECONDS || "60",
    10,
  ),
  otpMaxVerifyAttempts: parseInt(process.env.OTP_MAX_VERIFY_ATTEMPTS || "5", 10),
  initialVelGrant: parseInt(process.env.INITIAL_VEL_GRANT || "100", 10),
  unverifiedAccountTtlHours: parseInt(
    process.env.UNVERIFIED_ACCOUNT_TTL_HOURS || "24",
    10,
  ),
  unverifiedCleanupIntervalMinutes: parseInt(
    process.env.UNVERIFIED_CLEANUP_INTERVAL_MINUTES || "30",
    10,
  ),
  adminCreateKey: process.env.ADMIN_CREATE_KEY || "",
  walletEncryptionKey:
    process.env.WALLET_ENCRYPTION_KEY || "velen-dev-encryption-key-32ch",
};
