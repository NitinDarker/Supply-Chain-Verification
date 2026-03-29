/**
 * types.ts — Shared TypeScript interfaces and enums
 *
 * Single source of truth for every shape that crosses a module boundary.
 * Import from here, not from the class files directly.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum TxType {
  TRANSFER = "TRANSFER",
  PRODUCT_CREATE = "PRODUCT_CREATE",
  PRODUCT_MOVE = "PRODUCT_MOVE",
  GENESIS = "GENESIS",
}

// ─── Key Pair ─────────────────────────────────────────────────────────────────

export interface KeyPair {
  privateKey: string; // hex-encoded DER PKCS8
  publicKey: string; // hex-encoded DER SPKI
}

// ─── Transaction ─────────────────────────────────────────────────────────────

export interface TransactionInput {
  fromAddress: string;
  toAddress: string;
  amount?: number;
  type?: TxType;
  productId?: string | null;
  metadata?: Record<string, unknown>;
}

/** Plain serializable form — for MongoDB storage and API responses */
export interface TransactionDTO {
  txId: string | null;
  type: TxType;
  fromAddress: string;
  toAddress: string;
  amount: number;
  productId: string | null;
  metadata: Record<string, unknown>;
  timestamp: number;
  signature: string | null;
  publicKey: string | null;
}

// ─── Block ────────────────────────────────────────────────────────────────────

export interface BlockDTO {
  index: number;
  timestamp: number;
  transactions: TransactionDTO[];
  previousHash: string;
  nonce: number;
  hash: string;
}

// ─── Product Tracking ─────────────────────────────────────────────────────────

export interface ProductEvent extends TransactionDTO {
  blockIndex: number | null;
  blockHash: string | null;
  status: "CONFIRMED" | "PENDING";
}

export interface ProductSummary {
  productId: string;
  createdAt: number | null;
  currentHolder: string | null;
  totalMoves: number;
  lastUpdated: number | null;
}

export interface ProductHolder {
  currentHolder: string;
  lastEvent: ProductEvent;
}

// ─── Chain Validation ─────────────────────────────────────────────────────────

export type ValidationReason =
  | "INVALID_TRANSACTION_SIGNATURE"
  | "HASH_MISMATCH"
  | "BROKEN_CHAIN_LINK";

export type ChainValidationResult =
  | { valid: true }
  | { valid: false; errorAt: number; reason: ValidationReason };

// ─── Transaction Lookup ───────────────────────────────────────────────────────

export interface TxLookupResult {
  tx: TransactionDTO;
  blockIndex: number | "PENDING";
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface WalletPublicInfo {
  address: string;
  publicKey: string;
}

export interface WalletExport extends WalletPublicInfo {
  privateKey: string; // ENCRYPT before storing
}
