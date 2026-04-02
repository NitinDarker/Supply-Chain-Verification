import { Router, Request, Response } from "express";
import {
  authMiddleware as authenticate,
  requireRole,
} from "../middleware/auth.middleware";
import { blockchainService } from "../services/blockchain.service";
import { decryptPrivateKey } from "../services/encryption.service";
import { Wallet } from "../blockchain/wallet";
import { User } from "../models/User.model";

const router = Router();

/**
 * POST /api/products
 * Body: { productId: string, metadata?: object }
 * Roles: manufacturer only — only manufacturers create products.
 *
 * Registers a new product on-chain. The caller becomes the initial custodian.
 * Creates a signed PRODUCT_CREATE transaction and adds it to the mempool.
 */
router.post(
  "/",
  authenticate,
  requireRole("manufacturer", "admin"),
  async (req: Request, res: Response): Promise<void> => {
    const { productId, metadata = {} } = req.body;

    if (!productId || typeof productId !== "string") {
      res.status(400).json({ error: "productId is required." });
      return;
    }

    // Prevent registering a product that already exists on-chain
    const existing = blockchainService.chain.getProductHistory(productId);
    if (existing.length > 0) {
      res.status(409).json({
        error: `Product ${productId} is already registered on-chain.`,
      });
      return;
    }

    try {
      const user = await User.findById(req.user!.userId).lean();
      if (!user) {
        res.status(404).json({ error: "User not found." });
        return;
      }

      const privateKey = decryptPrivateKey(user.encryptedPrivateKey);
      console.log(privateKey);
      const wallet = new Wallet({ privateKey, publicKey: user.publicKey });
      const tx = wallet.createProduct(productId, {
        ...metadata,
        registeredBy: user.username,
        role: user.role,
      });

      const txId = blockchainService.chain.addProductTransaction(tx);
      await blockchainService.savePendingTx(tx);

      res.status(202).json({
        txId,
        status: "PENDING",
        productId,
        custodian: user.walletAddress,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to register product.";
        console.log(err)
      res.status(500).json({ error: message });
    }
  },
);

/**
 * POST /api/products/move
 * Body: { productId: string, toAddress: string, metadata?: object }
 * Roles: manufacturer, distributor, retailer — anyone in the supply chain.
 *
 * Transfers custody of a product to another wallet address.
 * CRITICAL: validates that the caller is the current custodian before signing.
 */
router.post(
  "/move",
  authenticate,
  requireRole("manufacturer", "distributor", "retailer", "admin"),
  async (req: Request, res: Response): Promise<void> => {
    const { productId, toAddress, metadata = {} } = req.body;

    if (!productId || typeof productId !== "string") {
      res.status(400).json({ error: "productId is required." });
      return;
    }
    if (!toAddress || typeof toAddress !== "string") {
      res.status(400).json({ error: "toAddress is required." });
      return;
    }

    // ── Custodian check — the blockchain core does NOT enforce this ────────────
    // This is the route layer's responsibility.
    const holderInfo =
      blockchainService.chain.getCurrentProductHolder(productId);
    if (!holderInfo) {
      res
        .status(404)
        .json({ error: `Product ${productId} not found on-chain.` });
      return;
    }
    if (holderInfo.currentHolder !== req.user!.walletAddress) {
      res.status(403).json({
        error: "You are not the current custodian of this product.",
        currentHolder: holderInfo.currentHolder,
      });
      return;
    }

    try {
      const user = await User.findById(req.user!.userId).lean();
      if (!user) {
        res.status(404).json({ error: "User not found." });
        return;
      }

      const privateKey = decryptPrivateKey(user.encryptedPrivateKey);
      const wallet = new Wallet({ privateKey, publicKey: user.publicKey });
      const tx = wallet.moveProduct(productId, toAddress, {
        ...metadata,
        movedBy: user.username,
        role: user.role,
      });

      const txId = blockchainService.chain.addProductTransaction(tx);
      await blockchainService.savePendingTx(tx);

      res.status(202).json({
        txId,
        status: "PENDING",
        productId,
        from: user.walletAddress,
        to: toAddress,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to move product.";
      if (message.startsWith("PRODUCT_NOT_FOUND")) {
        res.status(404).json({ error: message });
        return;
      }
      if (message.startsWith("INVALID_SIGNATURE")) {
        res.status(400).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  },
);

/**
 * GET /api/products
 * Public — list all products ever registered, with summary info.
 */
router.get("/", (_req: Request, res: Response): void => {
  const products = blockchainService.chain.getAllProducts();
  res.json({ count: products.length, products });
});

/**
 * GET /api/products/:productId
 * Public — full immutable journey of a product, sorted oldest-first.
 * Includes CONFIRMED (with blockIndex) and PENDING events.
 */
router.get("/:productId", (req: Request, res: Response): void => {
  const { productId } = req.params as { productId: string };

  const history = blockchainService.chain.getProductHistory(productId);
  if (history.length === 0) {
    res.status(404).json({ error: `Product ${productId} not found.` });
    return;
  }

  res.json({ productId, count: history.length, history });
});

/**
 * GET /api/products/:productId/holder
 * Public — who currently holds a product and what was the last transfer event.
 */
router.get("/:productId/holder", (req: Request, res: Response): void => {
  const { productId } = req.params as { productId: string };

  const holder = blockchainService.chain.getCurrentProductHolder(productId);
  if (!holder) {
    res.status(404).json({
      error: `Product ${productId} not found or has no confirmed events.`,
    });
    return;
  }

  res.json(holder);
});

export default router;
