import crypto from "crypto";
import { ec as EC } from "elliptic";
import * as bip39 from "bip39";
import { encryptPrivateKey } from "./encryption.service";

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
