import {
  createHash,
  generateKeyPairSync,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
} from "crypto";
import type { KeyPair } from "./types.ts";

// ─── Hashing ─────────────────────────────────────────────────────────────────

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(String(data)).digest("hex");
}

// ─── Key Generation ──────────────────────────────────────────────────────────

export function generateKeyPair(): KeyPair {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "secp256k1",
    privateKeyEncoding: { type: "pkcs8", format: "der" },
    publicKeyEncoding: { type: "spki", format: "der" },
  });

  return {
    privateKey: (privateKey as Buffer).toString("hex"),
    publicKey: (publicKey as Buffer).toString("hex"),
  };
}

// ─── Signing ─────────────────────────────────────────────────────────────────

export function signData(privateKeyHex: string, dataHash: string): string {
  const keyObject = createPrivateKey({
    key: Buffer.from(privateKeyHex, "hex"),
    format: "der",
    type: "pkcs8",
  });

  return sign("SHA256", Buffer.from(dataHash, "hex"), keyObject).toString(
    "hex",
  );
}

// ─── Verification ─────────────────────────────────────────────────────────────

export function verifySignature(
  publicKeyHex: string,
  dataHash: string,
  signatureHex: string,
): boolean {
  try {
    const keyObject = createPublicKey({
      key: Buffer.from(publicKeyHex, "hex"),
      format: "der",
      type: "spki",
    });

    return verify(
      "SHA256",
      Buffer.from(dataHash, "hex"),
      keyObject,
      Buffer.from(signatureHex, "hex"),
    );
  } catch {
    return false; // malformed key or signature — not a crash
  }
}

// ─── Address Derivation ───────────────────────────────────────────────────────

export function publicKeyToAddress(publicKeyHex: string): string {
  return "0x" + sha256(publicKeyHex).slice(-40);
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function generateTxId(prefix = "tx"): string {
  return `${prefix}-${sha256(prefix + Date.now() + Math.random())}`;
}
