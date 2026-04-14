/**
 * SERIAL NUMBER GENERATION — Guaranteed Unique, Non-Hackable
 *
 * Three layers of uniqueness:
 *
 *   1. STRUCTURE: {prefix}{timestamp_base36}{random}
 *      - Timestamp ensures monotonic ordering (no two milliseconds produce the same prefix)
 *      - Random part ensures uniqueness within the same millisecond
 *      - Combined: functionally impossible to collide
 *
 *   2. DATABASE: UNIQUE constraint on serial column
 *      - If (near-impossible) collision occurs, DB rejects and we retry with new random
 *      - Max 3 retries, then fail loudly
 *
 *   3. IN-MEMORY SET: Track recently generated serials in current process
 *      - Catches duplicates before they hit the DB (faster, reduces DB load)
 *      - Cleared periodically to prevent memory bloat
 *
 * Why non-hackable:
 *   - 10 random chars from 36-char alphabet = 36^10 = 3.66 × 10^15 possibilities per millisecond
 *   - An attacker would need to guess the exact serial to forge a QR code
 *   - Even if they guess the serial, the HMAC signature (128-bit, keyed) prevents forgery
 *   - Even if they somehow get the HMAC key, Ed25519 (asymmetric) provides a second layer
 *   - The serial is NOT the security — the signature is. The serial is just a unique ID.
 *
 * Format: BIN{timestamp_base36_8chars}{random_10chars}
 * Example: BINK3F7G2A1RQWX5T9M2P
 * Length: 3 + 8 + 10 = 21 characters
 *
 * Why this format:
 *   - Starts with BIN: instantly recognizable, brandable
 *   - Timestamp portion: sortable, debuggable (you can see when it was generated)
 *   - Random portion: unpredictable, collision-resistant
 *   - All uppercase alphanumeric: QR alphanumeric mode compatible (smaller QR codes)
 */

import crypto from "crypto";

// Base36 alphabet (0-9, A-Z) — compatible with QR alphanumeric mode
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const RANDOM_LENGTH = 10; // 36^10 = 3.66 × 10^15 per millisecond
const TIMESTAMP_LENGTH = 8; // 36^8 = 2.82 × 10^12, covers ~89 years from epoch

// In-memory dedup set (per-process, cleared every 60 seconds)
const recentSerials = new Set<string>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;
const MAX_SET_SIZE = 100_000;

/**
 * Generate a cryptographically random string of given length from ALPHABET.
 * Uses crypto.randomBytes for true randomness (not Math.random).
 */
function randomAlphanumeric(length: number): string {
  const bytes = crypto.randomBytes(length * 2); // Extra bytes to handle modulo bias
  let result = "";
  for (let i = 0; i < bytes.length && result.length < length; i++) {
    const idx = bytes[i] % 64; // Slightly biased but acceptable for 36-char alphabet
    if (idx < 36) {
      result += ALPHABET[idx];
    }
  }
  // If we somehow didn't get enough (extremely unlikely), pad with more random
  while (result.length < length) {
    const extra = crypto.randomBytes(2);
    const idx = extra[0] % 64;
    if (idx < 36) result += ALPHABET[idx];
  }
  return result;
}

/**
 * Encode a number as base36 string, zero-padded to given length.
 */
function toBase36(num: number, length: number): string {
  let result = "";
  let n = Math.floor(num);
  while (n > 0) {
    result = ALPHABET[n % 36] + result;
    n = Math.floor(n / 36);
  }
  return (result || "0").padStart(length, "0").slice(-length);
}

/**
 * Generate a unique serial number.
 *
 * Format: BIN{timestamp_base36_8}{random_10}
 * Total: 21 characters
 *
 * Guaranteed unique by:
 *   1. Timestamp (millisecond precision) — different each ms
 *   2. Cryptographic random — different each call within same ms
 *   3. In-memory dedup — catches the statistically impossible same-ms collision
 *   4. DB UNIQUE constraint — final safety net
 */
export function generateSerial(): string {
  // Cleanup old serials periodically
  const now = Date.now();
  if (now - lastCleanup > CLEANUP_INTERVAL_MS || recentSerials.size > MAX_SET_SIZE) {
    recentSerials.clear();
    lastCleanup = now;
  }

  // Try up to 5 times (collision within same ms AND same random = astronomically unlikely)
  for (let attempt = 0; attempt < 5; attempt++) {
    const timestamp = toBase36(now, TIMESTAMP_LENGTH);
    const random = randomAlphanumeric(RANDOM_LENGTH);
    const serial = `BIN${timestamp}${random}`;

    if (!recentSerials.has(serial)) {
      recentSerials.add(serial);
      return serial;
    }
    // If we somehow collided in-memory, try again with new random
  }

  // Should never reach here. If it does, something is very wrong.
  throw new Error("Failed to generate unique serial after 5 attempts");
}

/**
 * Validate a serial number format.
 * Returns true if the serial matches BIN + 18 alphanumeric chars.
 */
export function isValidSerial(serial: string): boolean {
  return /^BIN[0-9A-Z]{18}$/.test(serial);
}

/**
 * Extract the approximate generation timestamp from a serial.
 * Useful for debugging and auditing.
 */
export function getSerialTimestamp(serial: string): Date | null {
  if (!isValidSerial(serial)) return null;
  const timestampPart = serial.slice(3, 11); // 8 chars after BIN
  let ms = 0;
  for (const char of timestampPart) {
    ms = ms * 36 + ALPHABET.indexOf(char);
  }
  return new Date(ms);
}

/**
 * Generate a batch of unique serials.
 * All serials are guaranteed unique within the batch AND against recent history.
 */
export function generateSerialBatch(count: number): string[] {
  const serials: string[] = [];
  const batchSet = new Set<string>();

  for (let i = 0; i < count; i++) {
    let serial: string;
    let attempts = 0;
    do {
      serial = generateSerial();
      attempts++;
      if (attempts > 10) throw new Error(`Serial generation stuck after ${attempts} attempts`);
    } while (batchSet.has(serial));

    batchSet.add(serial);
    serials.push(serial);
  }

  return serials;
}
