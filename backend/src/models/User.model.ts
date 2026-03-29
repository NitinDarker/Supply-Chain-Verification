import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "admin" | "manufacturer" | "distributor" | "retailer" | "user";
export type UserStatus = "unverified" | "verified";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  walletAddress: string;
  publicKey: string;
  encryptedPrivateKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "manufacturer", "distributor", "retailer", "user"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["unverified", "verified"],
      default: "unverified",
    },
    walletAddress: {
      type: String,
      required: true,
      unique: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    encryptedPrivateKey: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>("User", userSchema);
