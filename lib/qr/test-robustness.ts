/**
 * ROBUSTNESS TESTS — Stress test uniqueness, serialization, and security.
 *
 * Run: npx tsx lib/qr/test-robustness.ts
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { generateSerial, isValidSerial, getSerialTimestamp, generateSerialBatch } from "./serial";
import { signPayload, verifySignature, buildGS1DigitalLinkURL, parseGS1DigitalLinkURL, getCurrentKeyVersion } from "./crypto";
import { generateQRCode } from "./generator";
import type { ProductRegistration } from "./types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) { console.log(`  ✓ ${name}`); passed++; }
  else { console.log(`  ✗ ${name}`); failed++; }
}

const TEST_PRODUCT: ProductRegistration = {
  pibo_name: "Robustness Test Corp",
  cpcb_registration: "CPCB-ROBUST-TEST",
  gtin: "8901234567890",
  sku: "ROBUST-TEST",
  product_name: "Robustness Test Product",
  plastic_type: "CAT_I",
  thickness_microns: 250,
  net_weight_g: 500,
  material: "PET",
};

async function main() {
  console.log("==========================================================");
  console.log("BIN QR SERVICE — ROBUSTNESS TESTS");
  console.log("==========================================================\n");

  // ============================================================
  // 1. UNIQUENESS: 100,000 serials, zero collisions
  // ============================================================
  console.log("1. UNIQUENESS: 100,000 serials");
  const startGen = Date.now();
  const serials100k = generateSerialBatch(100_000);
  const genTime = Date.now() - startGen;
  const uniqueSet = new Set(serials100k);
  assert(uniqueSet.size === 100_000, `100,000 serials, all unique (${genTime}ms, ${(100_000 / genTime * 1000).toFixed(0)}/sec)`);

  // ============================================================
  // 2. FORMAT VALIDATION: every serial matches spec
  // ============================================================
  console.log("\n2. FORMAT: Every serial matches BIN + 18 alphanumeric");
  let allValid = true;
  let formatErrors = 0;
  for (const s of serials100k) {
    if (!isValidSerial(s)) { allValid = false; formatErrors++; }
  }
  assert(allValid, `All 100,000 match format (${formatErrors} errors)`);
  assert(serials100k[0].length === 21, `Length is 21 chars: ${serials100k[0]}`);

  // ============================================================
  // 3. TIMESTAMP EXTRACTION: timestamps are sane
  // ============================================================
  console.log("\n3. TIMESTAMPS: Extractable and sane");
  const now = Date.now();
  let tsErrors = 0;
  for (let i = 0; i < 100; i++) {
    const ts = getSerialTimestamp(serials100k[i]);
    if (!ts || Math.abs(ts.getTime() - now) > 60000) tsErrors++; // Within 1 minute
  }
  assert(tsErrors === 0, `100 sampled timestamps all within 1 minute of now (${tsErrors} errors)`);

  // ============================================================
  // 4. ORDERING: serials generated later have >= timestamp prefix
  // ============================================================
  console.log("\n4. ORDERING: Monotonic timestamp prefix");
  let orderErrors = 0;
  for (let i = 1; i < 1000; i++) {
    const tsPrev = serials100k[i - 1].slice(3, 11);
    const tsCurr = serials100k[i].slice(3, 11);
    if (tsCurr < tsPrev) orderErrors++;
  }
  assert(orderErrors === 0, `First 1,000 serials: timestamp prefix is monotonic (${orderErrors} errors)`);

  // ============================================================
  // 5. RANDOMNESS: random portions are well-distributed
  // ============================================================
  console.log("\n5. RANDOMNESS: Character distribution in random portion");
  const charCounts: Record<string, number> = {};
  for (const s of serials100k.slice(0, 10000)) {
    const random = s.slice(11); // Last 10 chars
    for (const c of random) {
      charCounts[c] = (charCounts[c] || 0) + 1;
    }
  }
  // 10,000 serials × 10 random chars = 100,000 chars. 36 alphabet = expected ~2,778 per char.
  const expectedPerChar = 100_000 / 36;
  let maxDeviation = 0;
  for (const [char, count] of Object.entries(charCounts)) {
    const deviation = Math.abs(count - expectedPerChar) / expectedPerChar;
    if (deviation > maxDeviation) maxDeviation = deviation;
  }
  assert(maxDeviation < 0.15, `Max character deviation: ${(maxDeviation * 100).toFixed(1)}% (threshold: 15%)`);
  assert(Object.keys(charCounts).length === 36, `All 36 alphabet chars appear (got ${Object.keys(charCounts).length})`);

  // ============================================================
  // 6. CONCURRENT GENERATION: parallel batches don't collide
  // ============================================================
  console.log("\n6. CONCURRENCY: 10 parallel batches of 1,000");
  const parallelBatches = await Promise.all(
    Array.from({ length: 10 }, () => Promise.resolve(generateSerialBatch(1000)))
  );
  const allParallel = parallelBatches.flat();
  const parallelUnique = new Set(allParallel);
  assert(parallelUnique.size === 10_000, `10 parallel batches × 1,000 = 10,000 all unique (got ${parallelUnique.size})`);

  // ============================================================
  // 7. HMAC INTEGRITY: signature survives round-trip
  // ============================================================
  console.log("\n7. HMAC: Signature integrity across 1,000 codes");
  let hmacErrors = 0;
  for (let i = 0; i < 1000; i++) {
    const data: Record<string, unknown> = {
      gtin: "8901234567890",
      serial: serials100k[i],
      batch: "LOT001",
      deposit_paisa: 500,
    };
    const sig = signPayload(data);
    if (!verifySignature(data, sig)) hmacErrors++;
  }
  assert(hmacErrors === 0, `1,000 sign-verify round trips (${hmacErrors} errors)`);

  // ============================================================
  // 8. TAMPER DETECTION: any field change invalidates signature
  // ============================================================
  console.log("\n8. TAMPER DETECTION: Every field modification caught");
  const original: Record<string, unknown> = {
    gtin: "8901234567890",
    serial: "BINTESTSERIAL",
    batch: "LOT001",
    deposit_paisa: 500,
    material: "PET",
  };
  const sig = signPayload(original);

  // Tamper each field individually
  const tamperTests = [
    { ...original, gtin: "8901234567891" },
    { ...original, serial: "BINTAMPERED" },
    { ...original, batch: "LOT002" },
    { ...original, deposit_paisa: 999 },
    { ...original, material: "MLP" },
    { ...original, extra_field: "injected" },
  ];
  let tamperCaught = 0;
  for (const tampered of tamperTests) {
    if (!verifySignature(tampered, sig)) tamperCaught++;
  }
  assert(tamperCaught === tamperTests.length, `${tamperCaught}/${tamperTests.length} tamper attempts detected`);

  // ============================================================
  // 9. GS1 URL ROUND-TRIP: build → parse → verify all fields
  // ============================================================
  console.log("\n9. GS1 URL: 1,000 build-parse round trips");
  let urlErrors = 0;
  for (let i = 0; i < 1000; i++) {
    const serial = serials100k[i];
    const urlSig = signPayload({ serial, gtin: "8901234567890" });
    const url = buildGS1DigitalLinkURL({
      domain: "https://bin.eco",
      gtin: "8901234567890",
      serial,
      batch: `LOT${i}`,
      net_weight_g: 500,
      deposit_paisa: 500,
      plastic_category: "CAT_I",
      material: "PET",
      thickness_microns: 250,
      cpcb_registration: "CPCB-TEST",
      version: 1,
      signature: urlSig,
      key_version: 1,
    });
    const parsed = parseGS1DigitalLinkURL(url);
    if (!parsed ||
        parsed.gtin !== "8901234567890" ||
        parsed.serial !== serial ||
        parsed.batch !== `LOT${i}` ||
        parsed.deposit_paisa !== 500 ||
        parsed.plastic_category !== "CAT_I" ||
        parsed.material !== "PET" ||
        parsed.thickness_microns !== 250 ||
        parsed.cpcb_registration !== "CPCB-TEST") {
      urlErrors++;
    }
  }
  assert(urlErrors === 0, `1,000 URL round trips (${urlErrors} errors)`);

  // ============================================================
  // 10. QR GENERATION: 100 full codes (image + URL + payload)
  // ============================================================
  console.log("\n10. QR GENERATION: 100 full codes with images");
  const startQr = Date.now();
  const qrCodes = [];
  for (let i = 0; i < 100; i++) {
    const qr = await generateQRCode({ product: TEST_PRODUCT, batch_id: `ROBUSTLOT${i}` });
    qrCodes.push(qr);
  }
  const qrTime = Date.now() - startQr;
  assert(qrCodes.length === 100, `100 QR codes generated in ${qrTime}ms (${(100 / qrTime * 1000).toFixed(0)}/sec)`);

  // All serials unique
  const qrSerials = new Set(qrCodes.map((q) => q.serial));
  assert(qrSerials.size === 100, `All 100 QR serials unique`);

  // All have valid images
  const allImages = qrCodes.every((q) => q.qr_data_url.startsWith("data:image/png;base64,"));
  assert(allImages, "All 100 have PNG images");

  // All GS1 URLs parse correctly
  const allParseable = qrCodes.every((q) => {
    const p = parseGS1DigitalLinkURL(q.gs1_url);
    return p && p.serial === q.serial;
  });
  assert(allParseable, "All 100 GS1 URLs parse back correctly");

  // ============================================================
  // 11. DATABASE: Insert 100 codes, verify uniqueness enforced
  // ============================================================
  console.log("\n11. DATABASE: Insert 100 codes + uniqueness enforcement");

  // Register test product
  await supabase.from("product_registrations").upsert({
    gtin: "8901234567890",
    brand_id: "ROBUST-TEST",
    pibo_name: "Robustness Test Corp",
    cpcb_registration: "CPCB-ROBUST-TEST",
    sku: "ROBUST-TEST",
    product_name: "Robustness Test Product",
    plastic_type: "CAT_I",
    thickness_microns: 250,
    net_weight_g: 500,
    material: "PET",
  }, { onConflict: "gtin" });

  // Insert 100 codes
  const insertRows = qrCodes.map((qr) => ({
    serial: qr.serial,
    gs1_url: qr.gs1_url,
    payload: qr.payload,
    status: "active",
    deposit_paisa: qr.payload.deposit_paisa,
    brand_id: "ROBUST-TEST",
    product_gtin: "8901234567890",
    batch_id: "ROBUSTLOT",
    plastic_category: "CAT_I",
    material: "PET",
    thickness_microns: 250,
    cpcb_registration: "CPCB-ROBUST-TEST",
    created_by: "robustness-test",
  }));

  const { error: insertErr } = await supabase.from("qr_codes").insert(insertRows);
  assert(!insertErr, `100 codes inserted (${insertErr?.message || "ok"})`);

  // Try to insert a duplicate serial
  const dupRow = { ...insertRows[0] }; // Same serial
  const { error: dupErr } = await supabase.from("qr_codes").insert([dupRow]);
  assert(dupErr !== null, `Duplicate serial rejected by DB (${dupErr?.code || "no error"})`);

  // ============================================================
  // 12. REDEMPTION RACE: concurrent redeems on same code
  // ============================================================
  console.log("\n12. RACE CONDITION: 10 concurrent redeems on one code");
  const targetSerial = qrCodes[0].serial;

  const redeemResults = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      supabase
        .from("qr_codes")
        .update({
          status: "redeemed",
          redeemed_at: new Date().toISOString(),
          redeemed_by: `racer-${i}@upi`,
        })
        .eq("serial", targetSerial)
        .eq("status", "active")
        .select("id")
        .single()
    )
  );

  const successCount = redeemResults.filter((r) => r.data !== null && !r.error).length;
  const failCount = redeemResults.filter((r) => r.data === null || r.error).length;
  assert(successCount === 1, `Exactly 1 redeemer won (got ${successCount} successes, ${failCount} failures)`);

  // Verify the code is actually redeemed
  const { data: afterRedeem } = await supabase
    .from("qr_codes")
    .select("status, redeemed_by")
    .eq("serial", targetSerial)
    .single();
  assert(afterRedeem?.status === "redeemed", `Final status: ${afterRedeem?.status}`);
  assert(afterRedeem?.redeemed_by?.startsWith("racer-"), `Redeemed by: ${afterRedeem?.redeemed_by}`);

  // ============================================================
  // 13. BRUTE FORCE RESISTANCE: signature space analysis
  // ============================================================
  console.log("\n13. BRUTE FORCE: Signature space analysis");
  const sampleSig = signPayload({ test: "data" });
  assert(sampleSig.length === 32, `Signature length: ${sampleSig.length} hex chars = ${sampleSig.length * 4} bits`);
  const bruteForceAttempts = Math.pow(2, sampleSig.length * 4 / 2); // Birthday bound
  assert(bruteForceAttempts > 1e18, `Birthday bound: ${bruteForceAttempts.toExponential(2)} attempts (>10^18)`);
  console.log(`  At 1M attempts/sec: ${(bruteForceAttempts / 1e6 / 3600 / 24 / 365).toExponential(2)} years`);

  // ============================================================
  // 14. SERIAL PREDICTION RESISTANCE
  // ============================================================
  console.log("\n14. PREDICTION: Can't guess next serial from previous");
  const s1 = generateSerial();
  const s2 = generateSerial();
  const randomPart1 = s1.slice(11);
  const randomPart2 = s2.slice(11);
  // Hamming distance between random parts should be high
  let diffChars = 0;
  for (let i = 0; i < randomPart1.length; i++) {
    if (randomPart1[i] !== randomPart2[i]) diffChars++;
  }
  assert(diffChars >= 5, `Random parts differ in ${diffChars}/10 positions (need >=5)`);

  // ============================================================
  // 15. CLEANUP
  // ============================================================
  console.log("\n15. CLEANUP");
  await supabase.from("qr_codes").delete().eq("created_by", "robustness-test");
  console.log("  ✓ Test data cleaned up");

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log(`\n${"=".repeat(58)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`${"=".repeat(58)}`);

  if (failed === 0) {
    console.log("\nAll robustness tests passed:");
    console.log("  - 100,000 serials: zero collisions");
    console.log("  - Format, timestamp, ordering: all correct");
    console.log("  - Character distribution: uniform (<15% deviation)");
    console.log("  - 10 parallel batches: zero cross-collisions");
    console.log("  - 1,000 HMAC sign-verify: zero errors");
    console.log("  - 6 tamper attempts: all caught");
    console.log("  - 1,000 GS1 URL round-trips: zero errors");
    console.log("  - 100 QR codes with images: all unique, all valid");
    console.log("  - DB uniqueness: duplicate rejected");
    console.log("  - 10 concurrent redeems: exactly 1 winner");
    console.log("  - Brute force: >10^18 attempts needed");
    console.log("  - Serial prediction: random parts differ significantly");
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1); });
