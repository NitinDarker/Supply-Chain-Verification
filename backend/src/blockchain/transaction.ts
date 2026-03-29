/**
 * transaction.ts — Transaction Model
 */

import { sha256, signData, verifySignature } from "./crypto";
import { TxType } from "./types";
import type { TransactionInput, TransactionDTO } from "./types";

export class Transaction {
  public txId: string | null = null;
  public type: TxType;
  public fromAddress: string;
  public toAddress: string;
  public amount: number;
  public productId: string | null;
  public metadata: Record<string, unknown>;
  public timestamp: number;
  public signature: string | null = null;
  public publicKey: string | null = null;

  constructor({
    fromAddress,
    toAddress,
    amount = 0,
    type = TxType.TRANSFER,
    productId = null,
    metadata = {},
  }: TransactionInput) {
    if (!fromAddress) throw new Error("Transaction requires a fromAddress.");
    if (!toAddress) throw new Error("Transaction requires a toAddress.");
    if (typeof amount !== "number" || amount < 0) {
      throw new Error("Amount must be a non-negative number.");
    }

    this.type = type;
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.amount = amount;
    this.productId = productId;
    this.metadata = { ...metadata };
    this.timestamp = Date.now();
  }

  public calculateHash(): string {
    return sha256(
      this.fromAddress +
        this.toAddress +
        String(this.amount) +
        this.type +
        (this.productId ?? "") +
        JSON.stringify(this.metadata) +
        String(this.timestamp),
    );
  }

  public sign(privateKey: string, publicKey: string): void {
    if (this.type === TxType.GENESIS) {
      throw new Error("System/genesis transactions cannot be manually signed.");
    }
    if (this.signature) {
      throw new Error("Transaction already signed. Do not re-sign.");
    }
    const hash = this.calculateHash();
    this.signature = signData(privateKey, hash);
    this.publicKey = publicKey;
    this.txId = hash;
  }

  public isValid(): boolean {
    if (this.type === TxType.GENESIS) return true;
    if (!this.signature || !this.publicKey || !this.txId) return false;
    if (this.txId !== this.calculateHash()) return false;
    return verifySignature(this.publicKey, this.txId, this.signature);
  }

  public toDTO(): TransactionDTO {
    return {
      txId: this.txId,
      type: this.type,
      fromAddress: this.fromAddress,
      toAddress: this.toAddress,
      amount: this.amount,
      productId: this.productId,
      metadata: this.metadata,
      timestamp: this.timestamp,
      signature: this.signature,
      publicKey: this.publicKey,
    };
  }

  public static fromDTO(obj: TransactionDTO): Transaction {
    const tx = new Transaction({
      fromAddress: obj.fromAddress,
      toAddress: obj.toAddress,
      amount: obj.amount,
      type: obj.type,
      productId: obj.productId,
      metadata: obj.metadata,
    });
    tx.txId = obj.txId;
    tx.timestamp = obj.timestamp;
    tx.signature = obj.signature;
    tx.publicKey = obj.publicKey;
    return tx;
  }
}
