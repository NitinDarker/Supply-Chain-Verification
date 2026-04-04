import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Username: letters, numbers, underscores only"),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .max(72) // bcrypt max is 72 bytes
    .regex(/[A-Z]/, "Need one uppercase letter")
    .regex(/[0-9]/, "Need one number")
    .regex(/[^a-zA-Z0-9]/, "Need one special character"),
  role: z.enum(["manufacturer", "distributor", "retailer", "user"]),
  // note: "admin" not allowed via public registration
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
});

export const otpSchema = z.object({
  email: z.string().email(),
  otp: z
    .string()
    .length(6)
    .regex(/^\d{6}$/),
  purpose: z.enum(["signup", "reset"]),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .max(72)
    .regex(/[A-Z]/, "Need uppercase")
    .regex(/[0-9]/, "Need number")
    .regex(/[^a-zA-Z0-9]/, "Need special character"),
});
