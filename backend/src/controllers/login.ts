import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { createSession } from "../services/session.service";
import { COOKIE_OPTIONS } from "./cookies";

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    const user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    if (user.status !== "verified") {
      res.status(403).json({ error: "Email not verified. Please verify your email first." });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const token = await createSession(user._id.toString(), user.walletAddress, user.role);

    res.cookie("token", token, COOKIE_OPTIONS);

    res.json({
      message: "Login successful.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
      },
    });
  } catch (error) {
    console.error("[Login Error]:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
}
