/**
 * block.ts — Block Model
 */

import { sha256 } from "./crypto";
import { Transaction } from "./transaction";
import type { BlockDTO, TransactionDTO } from "./types";
import logger from "../config/logger";

export class Block {
  public index: number;
  public timestamp: number;
  public transactions: Transaction[];
  public previousHash: string;
  public nonce: number;
  public hash: string;

  constructor(index: number, transactions: Transaction[], previousHash = "") {
    this.index = index;
    this.timestamp = Date.now();
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  public calculateHash(): string {
    return sha256(
      String(this.index) +
        String(this.timestamp) +
        JSON.stringify(this.transactions.map((tx) => tx.toDTO())) +
        this.previousHash +
        String(this.nonce),
    );
  }

  public mineBlock(difficulty = 2): void {
    const target = "0".repeat(difficulty);
    const startedAt = Date.now();
    while (!this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    logger.info("[Block] Mined", {
      blockIndex: this.index,
      durationMs: Date.now() - startedAt,
      nonce: this.nonce,
      hashPrefix: this.hash.slice(0, 20),
    });
  }

  public hasValidTransactions(): boolean {
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        logger.error("[Block] Invalid transaction", {
          blockIndex: this.index,
          txId: tx.txId,
        });
        return false;
      }
    }
    return true;
  }

  public isHashValid(): boolean {
    return this.hash === this.calculateHash();
  }

  public toDTO(): BlockDTO {
    return {
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions.map((tx) => tx.toDTO()),
      previousHash: this.previousHash,
      nonce: this.nonce,
      hash: this.hash,
    };
  }

  public static fromDTO(obj: BlockDTO): Block {
    const txs = obj.transactions.map((t: TransactionDTO) =>
      Transaction.fromDTO(t),
    );
    const block = new Block(obj.index, txs, obj.previousHash);
    block.timestamp = obj.timestamp;
    block.nonce = obj.nonce;
    block.hash = obj.hash;
    return block;
  }
}
