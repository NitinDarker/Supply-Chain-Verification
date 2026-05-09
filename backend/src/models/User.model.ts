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
  profilePictureUrl?: string;
  lastOtpSentAt?: Date | null;
  otpExpiresAt?: Date | null;
  otpVerifiedAt?: Date | null;
  lastOtpPurpose?: "verify" | "reset" | null;
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
    profilePictureUrl: {
      type: String,
      required: false,
      trim: true,
    },
    lastOtpSentAt: {
      type: Date,
      default: null,
    },
    otpExpiresAt: {
      type: Date,
      default: null,
    },
    otpVerifiedAt: {
      type: Date,
      default: null,
    },
    lastOtpPurpose: {
      type: String,
      enum: ["verify", "reset"],
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ status: 1, createdAt: 1 });

export const User = mongoose.model<IUser>("User", userSchema);
