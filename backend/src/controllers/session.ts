import { Request, Response } from "express";
import { User } from "../models/User";
import { destroySession } from "../services/session.service";

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.userId).select("-password -encryptedPrivateKey");

    if (!user) {
      res.status(404).json({ error: "User not found." });
      return;
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        walletAddress: user.walletAddress,
        publicKey: user.publicKey,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("[Me Error]:", error);
    res.status(500).json({ error: "Failed to fetch user data." });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    await destroySession(req.user!.sessionId);
    res.clearCookie("token", { path: "/" });
    res.json({ message: "Logged out successfully." });
  } catch (error) {
    console.error("[Logout Error]:", error);
    res.status(500).json({ error: "Logout failed." });
  }
}
