import { Router, Request, Response } from "express";
import { authMiddleware as authenticate } from "../middleware/auth.middleware";
import { blockchainService } from "../services/blockchain.service";
import { User } from "../models/User.model";

const router = Router();

/**
 * GET /api/wallet/me
 * Returns the authenticated user's wallet address, public key, and confirmed balance.
 * JWT payload has the address — no DB fetch needed here.
 */
router.get("/me", authenticate, (req: Request, res: Response): void => {
  const { walletAddress } = req.user!;

  const balance = blockchainService.chain.getBalanceOfAddress(walletAddress);

  res.json({
    address: walletAddress,
    balance,
  });
});

/**
 * GET /api/wallet/balance/:address
 * Public — anyone can check any address's confirmed balance.
 */
router.get("/balance/:address", (req: Request, res: Response): void => {
  const { address } = req.params as { address: string };

  const balance = blockchainService.chain.getBalanceOfAddress(address);

  res.json({ address, balance });
});

/**
 * GET /api/wallet/transactions
 * Returns the full confirmed transaction history for the authenticated user.
 * Both sent and received, with blockIndex on each entry.
 */
router.get(
  "/transactions",
  authenticate,
  (req: Request, res: Response): void => {
    const { walletAddress } = req.user!;

    const transactions =
      blockchainService.chain.getTransactionsForAddress(walletAddress);

    res.json({ address: walletAddress, transactions });
  },
);

/**
 * GET /api/wallet/profile
 * Returns the authenticated user's profile (no sensitive fields).
 * This DOES hit MongoDB — needed to get username, email, role, status.
 */
router.get(
  "/profile",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await User.findById(req.user!.userId)
        .select("-password -encryptedPrivateKey")
        .lean();

      if (!user) {
        res.status(404).json({ error: "User not found." });
        return;
      }

      const balance = blockchainService.chain.getBalanceOfAddress(
        user.walletAddress,
      );

      res.json({ ...user, balance });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch profile." });
    }
  },
);

export default router;
