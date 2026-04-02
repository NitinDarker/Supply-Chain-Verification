// models/Wallet.model.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IWallet extends Document {
  username: string;
  passwordHash: string; // bcrypt
  address: string;
  publicKey: string;
  encryptedPrivateKey: string; // AES-256 encrypted, never stored raw
  role: "user" | "admin";
  createdAt: Date;
}

const WalletSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    address: { type: String, required: true, unique: true },
    publicKey: { type: String, required: true },
    encryptedPrivateKey: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  {
    timestamps: true, // createdAt, updatedAt handled by mongoose
  },
);

export default mongoose.model<IWallet>("Wallet", WalletSchema);
