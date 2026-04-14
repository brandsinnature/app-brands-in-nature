import crypto from "crypto";
import { customAlphabet } from "nanoid";
import barcoder from "barcoder";

// --- Key Management ---
// Support key rotation: include key version in QR URL (&kv=1)
// Maintain lookup table so old QR codes still validate after rotation.
const SIGNING_KEYS: Record<number, string> = {
  1: process.env.QR_SIGNING_SECRET || "bin-dev-secret-change-in-production",
};
const CURRENT_KEY_VERSION = 1;

// --- Serial Generation (nanoid, cryptographic, URL-safe) ---
// Alphabet: 0-9 A-Z (36 chars). Length: 16.
// Combinations: 36^16 = 7.96 × 10^24. Collision probability negligible at billions of codes.
const generateId = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 16);

export function generateSerial(): string {
  return `BIN${generateId()}`;
}

// --- GTIN Validation (uses barcoder for check-digit) ---
export function validateGTIN(gtin: string): { valid: boolean; error?: string } {
  if (!barcoder.validate(gtin)) {
    return { valid: false, error: `Invalid GTIN check digit: ${gtin}` };
  }
  return { valid: true };
}

// --- HMAC Signing ---
// Signs deterministic JSON of payload fields (sorted keys, excludes signature itself).
// Returns truncated HMAC: 16 hex chars (64-bit). Sufficient for tamper detection,
// keeps QR data compact for high-speed CIJ/TIJ printing (every byte counts at 300m/min).
export function signPayload(data: Record<string, unknown>, keyVersion?: number): string {
  const kv = keyVersion ?? CURRENT_KEY_VERSION;
  const secret = SIGNING_KEYS[kv];
  if (!secret) throw new Error(`Unknown key version: ${kv}`);

  const { signature, kv: _, ...rest } = data;
  const sorted = JSON.stringify(rest, Object.keys(rest).sort());
  // NIST SP 800-107r1: HMAC truncation below 128 bits is not recommended.
  // 32 hex chars = 128 bits. Adds only 16 chars to QR URL — negligible version impact.
  return crypto.createHmac("sha256", secret).update(sorted).digest("hex").slice(0, 32);
}

export function verifySignature(data: Record<string, unknown>, sig: string, keyVersion?: number): boolean {
  const computed = signPayload(data, keyVersion ?? CURRENT_KEY_VERSION);
  if (computed.length !== sig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sig));
}

export function getCurrentKeyVersion(): number {
  return CURRENT_KEY_VERSION;
}

// --- GS1 Digital Link URI ---
//
// Format: https://{domain}/01/{GTIN}/21/{serial}?10={batch}&3103={weight}&7240={deposit}
//   &_sig={hmac}&_kv={key_version}&_v={schema_version}
//   &_pc={plastic_category}&_mt={material}&_th={thickness}&_cr={cpcb_reg}
//
// GS1 Application Identifiers (path):
//   01  = GTIN (primary identification)
//   21  = Serial number (unit-level)
//
// GS1 Application Identifiers (query):
//   10   = Batch/lot number
//   3103 = Net weight in grams (×1000 for implied 3 decimal places per GS1 spec)
//   7240 = Custom extension: deposit value in paisa
//
// BIN extensions (prefixed _ to avoid GS1 collision):
//   _sig = HMAC-SHA256 truncated signature
//   _kv  = Key version (for rotation)
//   _v   = Schema version
//   _pc  = Plastic category (Rule 11A: CAT_I/II/III/IV)
//   _mt  = Material type (Rule 11A: PET/HDPE/MLP/etc.)
//   _th  = Thickness in microns (Rule 11A)
//   _cr  = CPCB registration number (Rule 11A)

export function buildGS1DigitalLinkURL(params: {
  domain: string;
  gtin: string;
  serial: string;
  batch: string;
  net_weight_g: number;
  deposit_paisa: number;
  plastic_category: string;
  material: string;
  thickness_microns: number;
  cpcb_registration: string;
  version: number;
  signature: string;
  key_version: number;
}): string {
  // GS1 Digital Link URI: path encodes primary IDs, query encodes qualifiers
  const path = `${params.domain}/01/${params.gtin}/21/${params.serial}`;

  const q = new URLSearchParams();
  q.set("10", params.batch);
  q.set("3103", String(Math.round(params.net_weight_g * 1000)));
  q.set("_dep", String(params.deposit_paisa));
  q.set("_sig", params.signature);
  q.set("_kv", String(params.key_version));
  q.set("_v", String(params.version));
  q.set("_pc", params.plastic_category);
  q.set("_mt", params.material);
  q.set("_th", String(params.thickness_microns));
  q.set("_cr", params.cpcb_registration);

  return `${path}?${q.toString()}`;
}

export function parseGS1DigitalLinkURL(url: string): {
  gtin: string;
  serial: string;
  batch: string;
  net_weight_g: number;
  deposit_paisa: number;
  plastic_category: string;
  material: string;
  thickness_microns: number;
  cpcb_registration: string;
  version: number;
  signature: string;
  key_version: number;
} | null {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/");

    // Extract /01/{GTIN}/21/{serial} from path
    const gtinIdx = pathParts.indexOf("01");
    const serialIdx = pathParts.indexOf("21");
    if (gtinIdx === -1 || serialIdx === -1) return null;

    const gtin = pathParts[gtinIdx + 1];
    const serial = pathParts[serialIdx + 1];
    if (!gtin || !serial) return null;

    const p = parsed.searchParams;
    return {
      gtin,
      serial,
      batch: p.get("10") || "",
      net_weight_g: parseInt(p.get("3103") || "0") / 1000,
      deposit_paisa: parseInt(p.get("_dep") || "0"),
      plastic_category: p.get("_pc") || "",
      material: p.get("_mt") || "",
      thickness_microns: parseInt(p.get("_th") || "0"),
      cpcb_registration: p.get("_cr") || "",
      version: parseInt(p.get("_v") || "1"),
      signature: p.get("_sig") || "",
      key_version: parseInt(p.get("_kv") || "1"),
    };
  } catch {
    return null;
  }
}
