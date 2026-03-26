/**
 * block.ts — Block Model
 */

import { sha256 } from "./crypto.ts";
import { Transaction } from "./transaction.ts";
import type { BlockDTO, TransactionDTO } from "./types.ts";

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
        JSON.stringify(this.transactions.map((tx) => tx.toJSON())) +
        this.previousHash +
        String(this.nonce),
    );
  }

  public mineBlock(difficulty = 2): void {
    const target = "0".repeat(difficulty);
    console.time(`[Block ${this.index}] mined`);
    while (!this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.timeEnd(`[Block ${this.index}] mined`);
    console.log(`  → nonce: ${this.nonce}, hash: ${this.hash.slice(0, 20)}...`);
  }

  public hasValidTransactions(): boolean {
    for (const tx of this.transactions) {
      if (!tx.isValid()) {
        console.error(`[Block ${this.index}] Invalid tx: ${tx.txId}`);
        return false;
      }
    }
    return true;
  }

  public isHashValid(): boolean {
    return this.hash === this.calculateHash();
  }

  public toJSON(): BlockDTO {
    return {
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions.map((tx) => tx.toJSON()),
      previousHash: this.previousHash,
      nonce: this.nonce,
      hash: this.hash,
    };
  }

  public static fromJSON(obj: BlockDTO): Block {
    const txs = obj.transactions.map((t: TransactionDTO) =>
      Transaction.fromJSON(t),
    );
    const block = new Block(obj.index, txs, obj.previousHash);
    block.timestamp = obj.timestamp;
    block.nonce = obj.nonce;
    block.hash = obj.hash;
    return block;
  }
}
