import { Blockchain } from "../blockchain/blockchain";
import { Block } from "../blockchain/block";
import { Transaction } from "../blockchain/transaction";
import type { BlockDTO, TransactionDTO } from "../blockchain/types";
import logger from "../config/logger";
import { redis } from "../config/redis";
import crypto from "crypto";

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

type BlockModel = typeof import("../models/Block.model").default;
type PendingTxModel =
  typeof import("../models/PendingTransaction.model").default;

class BlockchainService {
  public readonly chain: Blockchain;
  private blockModel?: BlockModel;
  private pendingModel?: PendingTxModel;
  private lastSyncAt = 0;
  private syncInFlight: Promise<void> | null = null;

  constructor() {
    this.chain = new Blockchain();
  }

  private async withChainWriteLock<T>(task: () => Promise<T>): Promise<T> {
    const lockKey = "chain:write-lock";
    const lockToken = crypto.randomUUID();
    const lockTtlSeconds = 20;

    const acquired = await redis.set(
      lockKey,
      lockToken,
      "EX",
      lockTtlSeconds,
      "NX",
    );

    if (!acquired) {
      throw new Error(
        "CHAIN_WRITE_LOCKED: Another chain write is in progress. Please retry.",
      );
    }

    try {
      return await task();
    } finally {
      const current = await redis.get(lockKey);
      if (current === lockToken) {
        await redis.del(lockKey);
      }
    }
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
      this.lastSyncAt = Date.now();
      logger.info("[Blockchain] Fresh chain - genesis block persisted.");
      return;
    }

    // Rebuild chain from DB, skipping genesis (already in memory from constructor)
    this.chain.chain = storedBlocks.map((b) => Block.fromDTO(b as BlockDTO));
    this.lastSyncAt = Date.now();
    logger.info("[Blockchain] Loaded blocks from MongoDB", {
      blockCount: this.chain.chain.length,
    });

    // Restore pending transactions if any survived a restart
    const pending = await PendingModel.find().lean();
    if (pending.length > 0) {
      this.chain.pendingTransactions = pending.map((t) =>
        Transaction.fromDTO(t as TransactionDTO),
      );
      logger.info("[Blockchain] Restored pending transactions", {
        pendingCount: pending.length,
      });
    }
  }

  /**
   * Refresh chain state from MongoDB only if stale.
   * Reduces stale reads across multiple backend instances behind a load balancer.
   */
  public async syncFromDBIfStale(maxAgeMs = 1500): Promise<void> {
    if (Date.now() - this.lastSyncAt < maxAgeMs) return;

    if (this.syncInFlight) {
      await this.syncInFlight;
      return;
    }

    this.syncInFlight = (async () => {
      await this.loadFromDB();
    })();

    try {
      await this.syncInFlight;
    } finally {
      this.syncInFlight = null;
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

    const latest = await this.blockModel.findOne().sort({ index: -1 }).lean();
    if (latest) {
      const expectedIndex = latest.index + 1;
      if (block.index !== expectedIndex) {
        throw new Error(
          `CHAIN_INDEX_MISMATCH: expected index ${expectedIndex}, got ${block.index}.`,
        );
      }
      if (block.previousHash !== latest.hash) {
        throw new Error(
          `CHAIN_LINK_MISMATCH: expected previousHash ${latest.hash}, got ${block.previousHash}.`,
        );
      }
    } else if (block.index !== 0 || block.previousHash !== "0") {
      throw new Error(
        "CHAIN_GENESIS_MISMATCH: First block must be genesis-compatible.",
      );
    }

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
  public async clearPendingTxs(txIds?: string[]): Promise<void> {
    if (!this.pendingModel) return;
    if (!txIds || txIds.length === 0) {
      await this.pendingModel.deleteMany({});
      return;
    }
    await this.pendingModel.deleteMany({ txId: { $in: txIds } });
  }

  public async grantInitialTokensAtomic(
    toAddress: string,
    amount: number,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.withChainWriteLock(async () => {
      await this.loadFromDB();

      const grantBlock = this.chain.grantInitialTokens(toAddress, amount, metadata);
      try {
        await this.persistBlock(grantBlock);
      } catch (error) {
        await this.loadFromDB();
        throw error;
      }
    });
  }

  public async minePendingTransactionsAtomic(
    validatorAddress: string,
  ): Promise<Block> {
    return this.withChainWriteLock(async () => {
      await this.loadFromDB();

      const block = this.chain.minePendingTransactions(validatorAddress);
      try {
        await this.persistBlock(block);
        const minedTxIds = block.transactions
          .map((tx) => tx.txId)
          .filter((txId): txId is string => Boolean(txId));
        await this.clearPendingTxs(minedTxIds);
      } catch (error) {
        await this.loadFromDB();
        throw error;
      }
      return block;
    });
  }
}

// Export as a module-level singleton — imported once, shared everywhere
export const blockchainService = new BlockchainService();
