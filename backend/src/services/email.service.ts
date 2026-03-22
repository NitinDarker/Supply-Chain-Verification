import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: false,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

export async function sendOTPEmail(to: string, otp: string, purpose: "verify" | "reset"): Promise<void> {
  const subject = purpose === "verify"
    ? "Velen - Verify Your Email"
    : "Velen - Password Reset OTP";

  const text = purpose === "verify"
    ? `Your email verification code is: ${otp}\n\nThis code expires in 5 minutes.`
    : `Your password reset code is: ${otp}\n\nThis code expires in 5 minutes.\n\nIf you did not request this, ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1a1a2e;">Velen</h2>
      <p>${purpose === "verify" ? "Verify your email to complete registration." : "Use this code to reset your password."}</p>
      <div style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${otp}</span>
      </div>
      <p style="color: #666; font-size: 14px;">This code expires in 5 minutes.</p>
      ${purpose === "reset" ? '<p style="color: #666; font-size: 14px;">If you did not request this, ignore this email.</p>' : ""}
    </div>
  `;

  // If SMTP not configured, just log to console
  if (!env.smtp.user || !env.smtp.pass) {
    console.log(`[Email] OTP for ${to} (${purpose}): ${otp}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Velen" <${env.smtp.user}>`,
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.warn(`[Email] Failed to send, logging OTP to console instead.`);
    console.log(`[Email] OTP for ${to} (${purpose}): ${otp}`);
  }
}
