/**
 * blockchain.ts — Blockchain Engine
 */

import { Block } from "./block.ts";
import { Transaction } from "./transaction.ts";
import { generateTxId } from "./crypto.ts";
import {
  TxType,
  type ChainValidationResult,
  type ProductHolder,
  type ProductSummary,
  type TxLookupResult,
  type TransactionDTO,
  type ProductEvent,
} from "./types.ts";

export const SYSTEM_ADDRESS = "SYSTEM" as const;
export const MINING_DIFFICULTY = 2 as const;
export const BLOCK_REWARD = 10 as const;
export const GENESIS_INIT_SUPPLY = 1_000_000 as const;

export class Blockchain {
  public chain: Block[];
  public pendingTransactions: Transaction[];
  public difficulty: number;
  private blockReward: number;

  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.pendingTransactions = [];
    this.difficulty = MINING_DIFFICULTY;
    this.blockReward = BLOCK_REWARD;
  }

  // ─── Genesis ───────────────────────────────────────────────────────────────

  private createGenesisBlock(): Block {
    const genesisTx = new Transaction({
      fromAddress: SYSTEM_ADDRESS,
      toAddress: SYSTEM_ADDRESS,
      amount: GENESIS_INIT_SUPPLY,
      type: TxType.GENESIS,
    });
    genesisTx.txId = "genesis-tx-0";
    genesisTx.timestamp = 0;

    const block = new Block(0, [genesisTx], "0");
    block.hash = block.calculateHash();
    return block;
  }

  // ─── Accessors ─────────────────────────────────────────────────────────────

  public getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }
  public getChainLength(): number {
    return this.chain.length;
  }
  public getBlockByIndex(i: number): Block | null {
    return this.chain[i] ?? null;
  }
  public getBlockByHash(hash: string): Block | null {
    return this.chain.find((b) => b.hash === hash) ?? null;
  }

  // ─── Transaction Acceptance ────────────────────────────────────────────────

  public addTransaction(transaction: Transaction): string {
    this.assertAddresses(transaction);

    if (transaction.type !== TxType.TRANSFER) {
      throw new Error(
        `Use addProductTransaction() for ${transaction.type} transactions.`,
      );
    }
    if (!transaction.isValid()) {
      throw new Error(
        "INVALID_SIGNATURE: Transaction signature verification failed.",
      );
    }
    if (transaction.amount <= 0) {
      throw new Error(
        "INVALID_AMOUNT: Transfer amount must be greater than zero.",
      );
    }

    const effective = this.getEffectiveBalance(transaction.fromAddress);
    if (effective < transaction.amount) {
      throw new Error(
        `INSUFFICIENT_FUNDS: Balance is ${effective}, tried to send ${transaction.amount}.`,
      );
    }

    this.assertNoDuplicate(transaction.txId!);
    this.pendingTransactions.push(transaction);
    return transaction.txId!;
  }

  public addProductTransaction(transaction: Transaction): string {
    this.assertAddresses(transaction);

    if (
      transaction.type !== TxType.PRODUCT_CREATE &&
      transaction.type !== TxType.PRODUCT_MOVE
    ) {
      throw new Error(
        `Expected PRODUCT_CREATE or PRODUCT_MOVE, got ${transaction.type}.`,
      );
    }
    if (!transaction.productId) {
      throw new Error(
        "MISSING_PRODUCT_ID: Product transactions must include a productId.",
      );
    }
    if (!transaction.isValid()) {
      throw new Error(
        "INVALID_SIGNATURE: Product transaction signature verification failed.",
      );
    }
    if (transaction.type === TxType.PRODUCT_MOVE) {
      const history = this.getProductHistory(transaction.productId);
      if (history.length === 0) {
        throw new Error(
          `PRODUCT_NOT_FOUND: Product ${transaction.productId} has no history. ` +
            `Create it first with PRODUCT_CREATE.`,
        );
      }
    }

    this.assertNoDuplicate(transaction.txId!);
    this.pendingTransactions.push(transaction);
    return transaction.txId!;
  }

  // ─── Block Sealing ─────────────────────────────────────────────────────────

  public minePendingTransactions(validatorAddress: string): Block {
    if (!validatorAddress)
      throw new Error("Validator address required for block reward.");
    if (this.pendingTransactions.length === 0) {
      throw new Error("NO_PENDING_TXS: Nothing to mine. Mempool is empty.");
    }

    const rewardTx = new Transaction({
      fromAddress: SYSTEM_ADDRESS,
      toAddress: validatorAddress,
      amount: this.blockReward,
      type: TxType.GENESIS,
    });
    rewardTx.txId = generateTxId("reward");
    rewardTx.timestamp = Date.now();

    const block = new Block(
      this.chain.length,
      [...this.pendingTransactions, rewardTx],
      this.getLatestBlock().hash,
    );

    block.mineBlock(this.difficulty);
    this.chain.push(block);
    this.pendingTransactions = [];
    return block;
  }

  // ─── Balance ───────────────────────────────────────────────────────────────

  public getBalanceOfAddress(address: string): number {
    let balance = 0;
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address) balance -= tx.amount;
        if (tx.toAddress === address) balance += tx.amount;
      }
    }
    return balance;
  }

  private getEffectiveBalance(address: string): number {
    const confirmed = this.getBalanceOfAddress(address);
    const pendingDebits = this.pendingTransactions
      .filter((tx) => tx.fromAddress === address && tx.type === TxType.TRANSFER)
      .reduce((sum, tx) => sum + tx.amount, 0);
    return confirmed - pendingDebits;
  }

  // ─── Transaction Queries ───────────────────────────────────────────────────

  public getTransactionsForAddress(address: string): TransactionDTO[] {
    const results: TransactionDTO[] = [];
    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.fromAddress === address || tx.toAddress === address) {
          results.push(tx.toJSON());
        }
      }
    }
    return results;
  }

  public getTransactionById(txId: string): TxLookupResult | null {
    for (const block of this.chain) {
      const found = block.transactions.find((tx) => tx.txId === txId);
      if (found) return { tx: found.toJSON(), blockIndex: block.index };
    }
    const pending = this.pendingTransactions.find((tx) => tx.txId === txId);
    if (pending) return { tx: pending.toJSON(), blockIndex: "PENDING" };
    return null;
  }

  // ─── Product Tracking ──────────────────────────────────────────────────────

  public getProductHistory(productId: string): ProductEvent[] {
    const history: ProductEvent[] = [];

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (tx.productId === productId) {
          history.push({
            ...tx.toJSON(),
            blockIndex: block.index,
            blockHash: block.hash,
            status: "CONFIRMED",
          });
        }
      }
    }

    for (const tx of this.pendingTransactions) {
      if (tx.productId === productId) {
        history.push({
          ...tx.toJSON(),
          blockIndex: null,
          blockHash: null,
          status: "PENDING",
        });
      }
    }

    return history.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }

  public getCurrentProductHolder(productId: string): ProductHolder | null {
    const history = this.getProductHistory(productId).filter(
      (e) => e.status === "CONFIRMED",
    );
    if (history.length === 0) return null;
    const lastEvent = history[history.length - 1];
    return { currentHolder: lastEvent.toAddress, lastEvent };
  }

  public getAllProducts(): ProductSummary[] {
    const products = new Map<string, ProductSummary>();

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        if (
          tx.type !== TxType.PRODUCT_CREATE &&
          tx.type !== TxType.PRODUCT_MOVE
        )
          continue;
        const id = tx.productId!;
        if (!products.has(id)) {
          products.set(id, {
            productId: id,
            createdAt: null,
            currentHolder: null,
            totalMoves: 0,
            lastUpdated: null,
          });
        }
        const p = products.get(id)!;
        if (tx.type === TxType.PRODUCT_CREATE) {
          p.createdAt = tx.timestamp;
          p.currentHolder = tx.toAddress;
        } else {
          p.currentHolder = tx.toAddress;
          p.totalMoves++;
        }
        p.lastUpdated = tx.timestamp;
      }
    }

    return Array.from(products.values());
  }

  // ─── Chain Validation ──────────────────────────────────────────────────────

  public validateChain(): ChainValidationResult {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (!current.hasValidTransactions()) {
        return {
          valid: false,
          errorAt: i,
          reason: "INVALID_TRANSACTION_SIGNATURE",
        };
      }
      if (!current.isHashValid()) {
        return { valid: false, errorAt: i, reason: "HASH_MISMATCH" };
      }
      if (current.previousHash !== previous.hash) {
        return { valid: false, errorAt: i, reason: "BROKEN_CHAIN_LINK" };
      }
    }
    return { valid: true };
  }

  // ─── Guards ────────────────────────────────────────────────────────────────

  private assertAddresses(tx: Transaction): void {
    if (!tx.fromAddress || !tx.toAddress) {
      throw new Error("Transaction must have both fromAddress and toAddress.");
    }
  }

  private assertNoDuplicate(txId: string): void {
    for (const block of this.chain) {
      if (block.transactions.some((t) => t.txId === txId)) {
        throw new Error(
          `DOUBLE_SPEND: Transaction ${txId} already confirmed on-chain.`,
        );
      }
    }
    if (this.pendingTransactions.some((t) => t.txId === txId)) {
      throw new Error(
        `DUPLICATE_PENDING: Transaction ${txId} already in mempool.`,
      );
    }
  }
}
