import crypto from "crypto";
import { ec as EC } from "elliptic";
import * as bip39 from "bip39";
import { env } from "../config/env";

const ecCurve = new EC("secp256k1");

export interface WalletData {
  mnemonic: string;
  privateKey: string;
  publicKey: string;
  walletAddress: string;
  encryptedPrivateKey: string;
}

// Generate a new wallet: mnemonic -> seed -> keypair -> address
export function generateWallet(): WalletData {
  const mnemonic = bip39.generateMnemonic(128);
  const seed = bip39.mnemonicToSeedSync(mnemonic);

  const privateKeyBytes = seed.subarray(0, 32);
  const keyPair = ecCurve.keyFromPrivate(privateKeyBytes);

  const privateKey = keyPair.getPrivate("hex");
  const publicKey = keyPair.getPublic("hex");

  // Derive wallet address from public key (sha256, last 20 bytes, prefix 0x)
  const pubKeyBuffer = Buffer.from(publicKey.slice(2), "hex");
  const addressHash = crypto.createHash("sha256").update(pubKeyBuffer).digest("hex");
  const walletAddress = "0x" + addressHash.slice(-40);

  const encryptedPrivateKey = encryptPrivateKey(privateKey);

  return { mnemonic, privateKey, publicKey, walletAddress, encryptedPrivateKey };
}

function encryptPrivateKey(privateKey: string): string {
  const key = crypto.createHash("sha256").update(env.walletEncryptionKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptPrivateKey(encryptedData: string): string {
  const [ivHex, encrypted] = encryptedData.split(":");
  const key = crypto.createHash("sha256").update(env.walletEncryptionKey).digest();
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
