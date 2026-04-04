import rateLimit from "express-rate-limit";

// Strict: login, OTP, password reset
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many attempts. Try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Medium: registration
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: "Too many registrations from this IP." },
});

// Loose: general API
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: "Rate limit exceeded." },
});

// Very strict: OTP (5 wrong guesses and you're locked)
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many OTP attempts. Request a new one." },
});

// Admin mine endpoint
export const mineLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "Mining too frequently." },
});
