import { Blockchain } from "../blockchain/blockchain";
import { Block } from "../blockchain/block";
import { Transaction } from "../blockchain/transaction";
import type { BlockDTO, TransactionDTO } from "../blockchain/types";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * BlockchainService — Singleton wrapper around the Blockchain core.
 *
 * Responsibilities:
 *   - Hold the single in-memory Blockchain instance the whole app shares.
 *   - Bootstrap it from MongoDB on startup (loadFromDB).
 *   - Persist new blocks to MongoDB after mining (persistBlock).
 *   - Optionally persist/clear pending transactions in MongoDB.
 *
 * Usage:
 *   import { blockchainService } from './services/blockchain.service';
 *   blockchainService.chain.addTransaction(tx);
 *
 * NEVER do `new Blockchain()` anywhere else in the app.
 */

// ─── Lazy model imports to avoid circular deps at module load time ────────────
// These are imported dynamically so this service can be loaded before
// Mongoose connects. Models are used only inside async methods.

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

type BlockModel = typeof import("../models/Block.model").default;
type PendingTxModel =
  typeof import("../models/PendingTransaction.model").default;

class BlockchainService {
  public readonly chain: Blockchain;
  private blockModel?: BlockModel;
  private pendingModel?: PendingTxModel;

  constructor() {
    this.chain = new Blockchain();
  }

  // ─── Bootstrap ─────────────────────────────────────────────────────────────

  /**
   * Call this once after Mongoose connects.
   * Loads every sealed block from MongoDB (sorted by index) and rebuilds
   * the in-memory chain. If DB is empty, the genesis block is already in memory.
   */
  public async loadFromDB(): Promise<void> {
    const { default: BlockModel } = await import("../models/Block.model");
    const { default: PendingModel } =
      await import("../models/PendingTransaction.model");
    this.blockModel = BlockModel;
    this.pendingModel = PendingModel;

    const storedBlocks = await BlockModel.find().sort({ index: 1 }).lean();

    if (storedBlocks.length === 0) {
      // First run — persist the genesis block so DB and memory are in sync
      await BlockModel.create(this.chain.chain[0].toDTO());
      console.log("[Blockchain] Fresh chain — genesis block persisted.");
      return;
    }

    // Rebuild chain from DB, skipping genesis (already in memory from constructor)
    this.chain.chain = storedBlocks.map((b) => Block.fromDTO(b as BlockDTO));
    console.log(
      `[Blockchain] Loaded ${this.chain.chain.length} blocks from MongoDB.`,
    );

    // Restore pending transactions if any survived a restart
    const pending = await PendingModel.find().lean();
    if (pending.length > 0) {
      this.chain.pendingTransactions = pending.map((t) =>
        Transaction.fromDTO(t as TransactionDTO),
      );
      console.log(
        `[Blockchain] Restored ${pending.length} pending transactions.`,
      );
    }
  }

  // ─── Persistence helpers ───────────────────────────────────────────────────

  /**
   * Persist a newly sealed block to MongoDB.
   * Call this immediately after minePendingTransactions() returns.
   */
  public async persistBlock(block: Block): Promise<void> {
    if (!this.blockModel)
      throw new Error(
        "BlockchainService not initialised. Call loadFromDB() first.",
      );
    await this.blockModel.create(block.toDTO());
  }

  /**
   * Save a pending transaction to MongoDB so it survives restarts.
   * Optional — mempool is intentionally ephemeral in many designs.
   */
  public async savePendingTx(tx: Transaction): Promise<void> {
    if (!this.pendingModel) return;
    await this.pendingModel.create(tx.toDTO());
  }

  /**
   * Clear all pending transactions from MongoDB after a block is mined.
   */
  public async clearPendingTxs(): Promise<void> {
    if (!this.pendingModel) return;
    await this.pendingModel.deleteMany({});
  }
}

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error("ENCRYPTION_KEY not set.");
  const key = Buffer.from(secret, "hex");
  if (key.length !== 32)
    throw new Error("ENCRYPTION_KEY must be 64 hex chars.");
  return key;
}

export function encryptPrivateKey(privateKeyHex: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(privateKeyHex, "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptPrivateKey(stored: string): string {
  const [ivHex, encryptedHex] = stored.split(":");
  if (!ivHex || !encryptedHex) throw new Error("Invalid encrypted key format.");
  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivHex, "hex"),
  );
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

// Export as a module-level singleton — imported once, shared everywhere
export const blockchainService = new BlockchainService();
