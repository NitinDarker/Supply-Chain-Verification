import { NextFunction, Request, Response } from "express";

type ValidationResult = {
  valid: boolean;
  error?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const OTP_REGEX = /^\d{6}$/;
const ALLOWED_ROLES = new Set([
  "manufacturer",
  "distributor",
  "retailer",
  "user",
]);

function sanitizeString(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F]/g, "").trim();
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
  if (!value || typeof value !== "object") return value;

  const sanitized: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    // Drop keys commonly used in NoSQL injection payloads.
    if (key.includes("$") || key.includes(".")) continue;
    sanitized[key] = sanitizeValue(raw);
  }
  return sanitized;
}

export function sanitizeInput(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query) as Request["query"];
  req.params = sanitizeValue(req.params) as Request["params"];
  next();
}

function asRecord(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function validateRegisterInput(body: unknown): ValidationResult {
  const payload = asRecord(body);
  if (!payload) return { valid: false, error: "Invalid request body." };

  const username = asString(payload.username);
  const email = asString(payload.email);
  const password = asString(payload.password);
  const role = asString(payload.role);

  if (!username || !email || !password || !role) {
    return {
      valid: false,
      error: "Username, email, password, and role are required.",
    };
  }
  if (
    username.length < 3 ||
    username.length > 30 ||
    !USERNAME_REGEX.test(username)
  ) {
    return {
      valid: false,
      error:
        "Username must be 3-30 chars and use letters, numbers, or underscores.",
    };
  }
  if (email.length > 254 || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: "Invalid email address." };
  }
  if (password.length < 6 || password.length > 72) {
    return { valid: false, error: "Password must be 6-72 characters." };
  }
  if (!ALLOWED_ROLES.has(role)) {
    return { valid: false, error: "Given role does not exist." };
  }

  return { valid: true };
}

export function validateLoginInput(body: unknown): ValidationResult {
  const payload = asRecord(body);
  if (!payload) return { valid: false, error: "Invalid request body." };

  const email = asString(payload.email);
  const password = asString(payload.password);
  if (!email || !password) {
    return { valid: false, error: "Email and password are required." };
  }
  if (email.length > 254 || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: "Invalid email address." };
  }
  if (password.length > 72) {
    return { valid: false, error: "Password is too long." };
  }

  return { valid: true };
}

export function validateVerifyOtpInput(body: unknown): ValidationResult {
  const payload = asRecord(body);
  if (!payload) return { valid: false, error: "Invalid request body." };

  const email = asString(payload.email);
  const otp = asString(payload.otp);
  if (!email || !otp)
    return { valid: false, error: "Email and OTP are required." };
  if (email.length > 254 || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: "Invalid email address." };
  }
  if (!OTP_REGEX.test(otp)) {
    return { valid: false, error: "OTP must be a 6-digit code." };
  }
  return { valid: true };
}

export function validateResendOtpInput(body: unknown): ValidationResult {
  const payload = asRecord(body);
  if (!payload) return { valid: false, error: "Invalid request body." };

  const email = asString(payload.email);
  const purpose = asString(payload.purpose);
  if (!email) return { valid: false, error: "Email is required." };
  if (email.length > 254 || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: "Invalid email address." };
  }
  if (purpose && purpose !== "verify" && purpose !== "reset") {
    return { valid: false, error: "Purpose must be verify or reset." };
  }
  return { valid: true };
}

export function validateResetPasswordInput(body: unknown): ValidationResult {
  const payload = asRecord(body);
  if (!payload) return { valid: false, error: "Invalid request body." };

  const email = asString(payload.email);
  const resetToken = asString(payload.resetToken);
  const newPassword = asString(payload.newPassword);

  if (!email || !resetToken || !newPassword) {
    return {
      valid: false,
      error: "Email, reset token, and new password are required.",
    };
  }
  if (email.length > 254 || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: "Invalid email address." };
  }
  if (newPassword.length < 6 || newPassword.length > 72) {
    return { valid: false, error: "Password must be 6-72 characters." };
  }

  return { valid: true };
}

export function validateCreateAdminInput(body: unknown): ValidationResult {
  const payload = asRecord(body);
  if (!payload) return { valid: false, error: "Invalid request body." };

  const username = asString(payload.username);
  const email = asString(payload.email);
  const password = asString(payload.password);

  if (!username || !email || !password) {
    return {
      valid: false,
      error: "Username, email, and password are required.",
    };
  }
  if (
    username.length < 3 ||
    username.length > 30 ||
    !USERNAME_REGEX.test(username)
  ) {
    return {
      valid: false,
      error:
        "Username must be 3-30 chars and use letters, numbers, or underscores.",
    };
  }
  if (email.length > 254 || !EMAIL_REGEX.test(email)) {
    return { valid: false, error: "Invalid email address." };
  }
  if (password.length < 8 || password.length > 72) {
    return { valid: false, error: "Password must be 8-72 characters." };
  }

  return { valid: true };
}

export function validateWith(validator: (body: unknown) => ValidationResult) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validator(req.body);
    if (!result.valid) {
      res.status(400).json({ error: result.error ?? "Invalid request body." });
      return;
    }
    next();
  };
}
