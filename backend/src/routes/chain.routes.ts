import { Router, Request, Response } from "express";
import {
  authMiddleware as authenticate,
  requireRole,
} from "../middleware/auth.middleware";
import { blockchainService } from "../services/blockchain.service";

const router = Router();

/**
 * GET /api/chain
 * Public — returns the full serialized chain as BlockDTO[].
 * Supports ?page and ?limit query params for basic pagination.
 */
router.get("/", (_req: Request, res: Response): void => {
  const page = Math.max(1, parseInt(_req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(_req.query.limit as string) || 20);
  const start = (page - 1) * limit;

  const allBlocks = blockchainService.chain.chain;
  const total = allBlocks.length;
  const paginated = allBlocks.slice(start, start + limit).map((b) => b.toDTO());

  res.json({
    total,
    page,
    limit,
    blocks: paginated,
  });
});

/**
 * GET /api/chain/stats
 * Public — quick summary stats without returning full block data.
 */
router.get("/stats", (_req: Request, res: Response): void => {
  const chain = blockchainService.chain;
  const latest = chain.getLatestBlock();

  res.json({
    height: chain.getChainLength(),
    latestBlockHash: latest.hash,
    latestBlockIndex: latest.index,
    latestBlockTime: latest.timestamp,
    pendingTransactions: chain.pendingTransactions.length,
    difficulty: chain.difficulty,
    totalProducts: chain.getAllProducts().length,
  });
});

/**
 * GET /api/chain/validate
 * Public — run a full integrity check on the chain.
 * Returns { valid: true } or { valid: false, errorAt, reason }.
 */
router.get("/validate", (_req: Request, res: Response): void => {
  const result = blockchainService.chain.validateChain();
  res.json(result);
});

/**
 * GET /api/chain/pending
 * Protected — returns all transactions in the mempool.
 * Restricted to admin so random users can't spy on unconfirmed transfers.
 */
router.get(
  "/pending",
  authenticate,
  requireRole("admin"),
  (_req: Request, res: Response): void => {
    const pending = blockchainService.chain.pendingTransactions.map((tx) =>
      tx.toDTO(),
    );
    res.json({ count: pending.length, transactions: pending });
  },
);

/**
 * GET /api/chain/blocks/:index
 * Public — returns a single block by its index with all its transactions.
 */
router.get("/blocks/:index", (req: Request, res: Response): void => {
  const index = parseInt(req.params.index as string, 10);

  if (isNaN(index) || index < 0) {
    res
      .status(400)
      .json({ error: "Block index must be a non-negative integer." });
    return;
  }

  const block = blockchainService.chain.getBlockByIndex(index);
  if (!block) {
    res.status(404).json({ error: `Block at index ${index} not found.` });
    return;
  }

  res.json(block.toDTO());
});

/**
 * POST /api/chain/mine
 * Admin only — manually trigger block sealing.
 *
 * Bundles all pending transactions, stamps the block, appends to chain,
 * persists to MongoDB, clears pending collection.
 * In production you'd replace this with an automated interval job.
 */
router.post(
  "/mine",
  authenticate,
  requireRole("admin"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const validatorAddress = req.user!.walletAddress;

      const newBlock =
        blockchainService.chain.minePendingTransactions(validatorAddress);

      // Persist sealed block and clear pending from MongoDB
      await blockchainService.persistBlock(newBlock);
      await blockchainService.clearPendingTxs();

      res.status(201).json({
        message: "Block mined successfully.",
        block: newBlock.toDTO(),
        chainHeight: blockchainService.chain.getChainLength(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Mining failed.";
      if (message.startsWith("NO_PENDING_TXS")) {
        res.status(400).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  },
);

export default router;
