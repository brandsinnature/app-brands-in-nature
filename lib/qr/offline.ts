/**
 * OFFLINE VALIDATION — Ed25519 Asymmetric Signing
 *
 * Problem: HMAC requires the secret key on every device that verifies.
 * Solution: Ed25519 — private key stays on server, public key ships with app.
 * Any device can verify a QR code offline with just the public key.
 *
 * This is the same pattern as EU Digital COVID Certificates.
 *
 * Key generation (run once, store in env):
 *   npx tsx -e "import{ed25519}from'@noble/curves/ed25519';const k=ed25519.utils.randomPrivateKey();console.log('PRIVATE:',Buffer.from(k).toString('hex'));console.log('PUBLIC:',Buffer.from(ed25519.getPublicKey(k)).toString('hex'))"
 *
 * Env vars:
 *   QR_ED25519_PRIVATE_KEY=<64 hex chars>
 *   NEXT_PUBLIC_QR_ED25519_PUBLIC_KEY=<64 hex chars>  (safe to expose — it's public)
 */

import { ed25519 } from "@noble/curves/ed25519";

const PRIVATE_KEY = process.env.QR_ED25519_PRIVATE_KEY
  ? Buffer.from(process.env.QR_ED25519_PRIVATE_KEY, "hex")
  : null;

const PUBLIC_KEY = process.env.NEXT_PUBLIC_QR_ED25519_PUBLIC_KEY
  ? Buffer.from(process.env.NEXT_PUBLIC_QR_ED25519_PUBLIC_KEY, "hex")
  : null;

/**
 * Sign a payload with Ed25519 (server-side only — needs private key).
 * Returns base64url-encoded signature (86 chars for 64-byte Ed25519 sig).
 */
export function ed25519Sign(data: Record<string, unknown>): string {
  if (!PRIVATE_KEY) throw new Error("QR_ED25519_PRIVATE_KEY not set");
  const { signature, _sig, ...rest } = data as Record<string, unknown>;
  const sorted = JSON.stringify(rest, Object.keys(rest).sort());
  const msg = new TextEncoder().encode(sorted);
  const sig = ed25519.sign(msg, PRIVATE_KEY);
  return Buffer.from(sig).toString("base64url");
}

/**
 * Verify a payload with Ed25519 (works OFFLINE — only needs public key).
 * This can run on any device: consumer phone, kirana tablet, RVM, waste picker app.
 * No network needed. No database needed. No server needed.
 */
export function ed25519Verify(data: Record<string, unknown>, sig: string): boolean {
  if (!PUBLIC_KEY) throw new Error("NEXT_PUBLIC_QR_ED25519_PUBLIC_KEY not set");
  try {
    const { signature, _sig, ...rest } = data as Record<string, unknown>;
    const sorted = JSON.stringify(rest, Object.keys(rest).sort());
    const msg = new TextEncoder().encode(sorted);
    const sigBytes = Buffer.from(sig, "base64url");
    return ed25519.verify(sigBytes, msg, PUBLIC_KEY);
  } catch {
    return false;
  }
}

/**
 * Generate a key pair (utility — run once during setup).
 */
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  const priv = ed25519.utils.randomPrivateKey();
  const pub = ed25519.getPublicKey(priv);
  return {
    privateKey: Buffer.from(priv).toString("hex"),
    publicKey: Buffer.from(pub).toString("hex"),
  };
}
