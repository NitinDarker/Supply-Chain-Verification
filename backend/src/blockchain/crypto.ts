import {
  createHash,
} from "crypto";
import { ec as EC } from "elliptic";
import type { KeyPair } from "./types";

const ecCurve = new EC("secp256k1");

// ─── Hashing ─────────────────────────────────────────────────────────────────

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(String(data)).digest("hex");
}

// ─── Key Generation ──────────────────────────────────────────────────────────

export function generateKeyPair(): KeyPair {
  const keyPair = ecCurve.genKeyPair();

  return {
    privateKey: keyPair.getPrivate("hex"),
    publicKey: keyPair.getPublic("hex"),
  };
}

// ─── Signing ─────────────────────────────────────────────────────────────────

export function signData(privateKeyHex: string, dataHash: string): string {
  const keyPair = ecCurve.keyFromPrivate(privateKeyHex, "hex");
  return keyPair.sign(dataHash).toDER("hex");
}

// ─── Verification ─────────────────────────────────────────────────────────────

export function verifySignature(
  publicKeyHex: string,
  dataHash: string,
  signatureHex: string,
): boolean {
  try {
    const keyPair = ecCurve.keyFromPublic(publicKeyHex, "hex");
    return keyPair.verify(dataHash, signatureHex);
  } catch {
    return false; // malformed key or signature — not a crash
  }
}

// ─── Address Derivation ───────────────────────────────────────────────────────

export function publicKeyToAddress(publicKeyHex: string): string {
  const normalized = publicKeyHex.startsWith("04")
    ? publicKeyHex.slice(2)
    : publicKeyHex;
  const pubKeyBuffer = Buffer.from(normalized, "hex");
  return "0x" + createHash("sha256").update(pubKeyBuffer).digest("hex").slice(-40);
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function generateTxId(prefix = "tx"): string {
  return `${prefix}-${sha256(prefix + Date.now() + Math.random())}`;
}
