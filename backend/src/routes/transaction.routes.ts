import { Router, Request, Response } from "express";
import { authMiddleware as authenticate } from "../middleware/auth.middleware";
import { blockchainService } from "../services/blockchain.service";
import { decryptPrivateKey } from "../services/encryption.service";
import { Wallet } from "../blockchain/wallet";
import { User } from "../models/User.model";

const router = Router();

/**
 * POST /api/transactions/transfer
 * Body: { toAddress: string, amount: number }
 *
 * Fetches the sender's full user doc to get encryptedPrivateKey,
 * decrypts it, signs the transaction, validates + adds to mempool.
 * Returns 202 with txId and PENDING status.
 */
router.post(
  "/transfer",
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    const { toAddress, amount } = req.body;

    if (!toAddress || typeof toAddress !== "string") {
      res.status(400).json({ error: "toAddress is required." });
      return;
    }
    if (typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ error: "amount must be a positive number." });
      return;
    }

    try {
      // Fetch full user doc — JWT payload doesn't carry the encrypted private key
      const user = await User.findById(req.user!.userId).lean();
      if (!user) {
        res.status(404).json({ error: "User not found." });
        return;
      }

      const privateKey = decryptPrivateKey(user.encryptedPrivateKey);
      const wallet = new Wallet({ privateKey, publicKey: user.publicKey });
      const tx = wallet.createTransfer(toAddress, amount);

      const txId = blockchainService.chain.addTransaction(tx);
      await blockchainService.savePendingTx(tx);

      res.status(202).json({
        txId,
        status: "PENDING",
        fromAddress: user.walletAddress,
        toAddress,
        amount,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Transfer failed.";

      // Map blockchain error codes to HTTP status codes
      if (message.startsWith("INSUFFICIENT_FUNDS")) {
        res.status(400).json({ error: message });
        return;
      }
      if (message.startsWith("INVALID_SIGNATURE")) {
        res.status(400).json({ error: message });
        return;
      }
      if (message.startsWith("DOUBLE_SPEND")) {
        res.status(409).json({ error: message });
        return;
      }
      if (message.startsWith("DUPLICATE_PENDING")) {
        res.status(409).json({ error: message });
        return;
      }

      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/transactions/:txId
 * Public — look up any transaction by its txId.
 * Returns the full DTO + blockIndex (number if confirmed, 'PENDING' if not).
 */
router.get("/:txId", (req: Request, res: Response): void => {
  const { txId } = req.params as { txId: string };

  const result = blockchainService.chain.getTransactionById(txId);

  if (!result) {
    res.status(404).json({ error: `Transaction ${txId} not found.` });
    return;
  }

  res.json(result);
});

export default router;
