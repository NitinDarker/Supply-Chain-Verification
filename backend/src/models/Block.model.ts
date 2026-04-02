// models/Block.model.ts
import mongoose, { Schema, Document } from "mongoose";
import { TransactionDTO } from "../config/types";

export interface IBlock extends Document {
  index: number;
  timestamp: number;
  transactions: TransactionDTO[];
  previousHash: string;
  nonce: number;
  hash: string;
}

const TransactionSchema = new Schema(
  {
    txId: { type: String, default: null },
    type: { type: String, required: true },
    fromAddress: { type: String, required: true },
    toAddress: { type: String, required: true },
    amount: { type: Number, required: true },
    productId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Number, required: true },
    signature: { type: String, default: null },
    publicKey: { type: String, default: null },
  },
  { _id: false },
); // no _id on subdocuments — txId is the identity

const BlockSchema = new Schema(
  {
    index: { type: Number, required: true, unique: true },
    timestamp: { type: Number, required: true },
    transactions: { type: [TransactionSchema], required: true },
    previousHash: { type: String, required: true },
    nonce: { type: Number, required: true },
    hash: { type: String, required: true, unique: true },
  },
  {
    timestamps: false, // we manage our own timestamp field
  },
);

export default mongoose.model<IBlock>("Block", BlockSchema);
