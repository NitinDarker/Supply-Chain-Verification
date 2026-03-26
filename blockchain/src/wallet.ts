import { generateKeyPair, publicKeyToAddress } from "./crypto.ts";
import { Transaction } from "./transaction.ts";
import { TxType } from "./types.ts";
import type { KeyPair, WalletPublicInfo, WalletExport } from "./types.ts";

export class Wallet {
  public readonly privateKey: string;
  public readonly publicKey: string;
  public readonly address: string;

  constructor(keys?: KeyPair) {
    const pair = keys ?? generateKeyPair();
    this.privateKey = pair.privateKey;
    this.publicKey = pair.publicKey;
    this.address = publicKeyToAddress(this.publicKey);
  }

  public createTransfer(toAddress: string, amount: number): Transaction {
    if (!toAddress) throw new Error("toAddress is required.");
    if (typeof amount !== "number" || amount <= 0)
      throw new Error("amount must be a positive number.");
    if (toAddress === this.address) throw new Error("Cannot send to yourself.");
    const tx = new Transaction({
      fromAddress: this.address,
      toAddress,
      amount,
      type: TxType.TRANSFER,
    });
    tx.sign(this.privateKey, this.publicKey);
    return tx;
  }

  public createProduct(
    productId: string,
    metadata: Record<string, unknown> = {},
  ): Transaction {
    if (!productId) throw new Error("productId is required.");
    const tx = new Transaction({
      fromAddress: this.address,
      toAddress: this.address,
      amount: 0,
      type: TxType.PRODUCT_CREATE,
      productId,
      metadata: { ...metadata, createdBy: this.address },
    });
    tx.sign(this.privateKey, this.publicKey);
    return tx;
  }

  public moveProduct(
    productId: string,
    toAddress: string,
    metadata: Record<string, unknown> = {},
  ): Transaction {
    if (!productId) throw new Error("productId is required.");
    if (!toAddress) throw new Error("toAddress (new custodian) is required.");
    const tx = new Transaction({
      fromAddress: this.address,
      toAddress,
      amount: 0,
      type: TxType.PRODUCT_MOVE,
      productId,
      metadata: { ...metadata, movedAt: Date.now() },
    });
    tx.sign(this.privateKey, this.publicKey);
    return tx;
  }

  public getPublicInfo(): WalletPublicInfo {
    return { address: this.address, publicKey: this.publicKey };
  }

  /** ENCRYPT privateKey with AES-256 before storing. Never send over the wire. */
  public exportFull(): WalletExport {
    return {
      address: this.address,
      publicKey: this.publicKey,
      privateKey: this.privateKey,
    };
  }

  public toString(): string {
    return `Wallet(${this.address.slice(0, 10)}...)`;
  }
}
