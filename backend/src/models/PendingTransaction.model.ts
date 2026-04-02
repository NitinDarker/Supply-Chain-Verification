// models/PendingTransaction.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IPendingTransaction extends Document {
  txId: string;
  type: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  productId: string | null;
  metadata: Record<string, unknown>;
  timestamp: number;
  signature: string;
  publicKey: string;
}

const PendingTransactionSchema = new Schema(
  {
    txId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    fromAddress: { type: String, required: true },
    toAddress: { type: String, required: true },
    amount: { type: Number, required: true },
    productId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Number, required: true },
    signature: { type: String, required: true },
    publicKey: { type: String, required: true },
  },
  {
    timestamps: false,
  },
);

export default mongoose.model<IPendingTransaction>(
  "PendingTransaction",
  PendingTransactionSchema,
);
