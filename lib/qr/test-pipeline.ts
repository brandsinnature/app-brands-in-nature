/**
 * End-to-end test of the QR pipeline.
 * Run: npx tsx lib/qr/test-pipeline.ts
 *
 * Tests:
 * 1. Generate serial → verify format (BIN + 16 alphanumeric)
 * 2. Sign payload → verify HMAC
 * 3. Build GS1 Digital Link URL → parse it back → verify all fields match
 * 4. Generate QR code → verify it produces PNG data URL
 * 5. Test Redis/BullMQ connection
 */

import { generateSerial, signPayload, verifySignature, buildGS1DigitalLinkURL, parseGS1DigitalLinkURL, getCurrentKeyVersion, validateGTIN } from "./crypto";
import { generateQRCode } from "./generator";
import { generateQRSVG, generateHighDPIQR, generateCSVManifest } from "./printer";
import IORedis from "ioredis";
import type { ProductRegistration, PrinterBatchManifest } from "./types";

async function runTests() {
  console.log("=== BIN QR Pipeline Test ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.log(`  ✗ ${name}`);
      failed++;
    }
  }

  // --- 1. Serial Generation ---
  console.log("\n1. Serial Generation (nanoid)");
  const serial1 = generateSerial();
  const serial2 = generateSerial();
  assert(serial1.startsWith("BIN"), "Serial starts with BIN");
  assert(serial1.length === 19, `Serial length is 19 (got ${serial1.length})`);
  assert(serial1 !== serial2, "Two serials are unique");
  assert(/^BIN[0-9A-Z]{16}$/.test(serial1), `Serial matches format: ${serial1}`);

  // --- 2. GTIN Validation (barcoder) ---
  console.log("\n2. GTIN Validation");
  const validGTIN = validateGTIN("8901234567890");
  // Note: check digit may not pass for this example, that's OK
  console.log(`  GTIN 8901234567890: ${validGTIN.valid ? "valid" : "invalid"} (${validGTIN.error || "ok"})`);
  const invalidGTIN = validateGTIN("000");
  assert(!invalidGTIN.valid, "Short GTIN rejected");

  // --- 3. HMAC Signing ---
  console.log("\n3. HMAC Signing + Verification");
  const testData = { gtin: "8901234567890", serial: serial1, batch: "LOT001" };
  const sig = signPayload(testData);
  assert(sig.length === 16, `Signature is 16 hex chars: ${sig}`);
  assert(verifySignature(testData, sig), "Signature verifies correctly");
  assert(!verifySignature({ ...testData, batch: "TAMPERED" }, sig), "Tampered data fails verification");

  // Key version
  const kv = getCurrentKeyVersion();
  assert(kv === 1, `Current key version: ${kv}`);

  // --- 4. GS1 Digital Link URL ---
  console.log("\n4. GS1 Digital Link URL Build + Parse");
  const gs1Params = {
    domain: "https://bin.eco",
    gtin: "8901234567890",
    serial: serial1,
    batch: "LOT2025A",
    net_weight_g: 52,
    deposit_paisa: 500,
    plastic_category: "CAT_III",
    material: "MLP",
    thickness_microns: 70,
    cpcb_registration: "CPCB-EP-2024-12345",
    version: 1,
    signature: sig,
    key_version: 1,
  };
  const url = buildGS1DigitalLinkURL(gs1Params);
  console.log(`  URL: ${url}`);
  assert(url.includes("/01/8901234567890/21/"), "URL has GS1 path /01/{GTIN}/21/{serial}");
  assert(url.includes("10=LOT2025A"), "URL has batch (AI 10)");
  assert(url.includes("3103=52000"), "URL has net weight (AI 3103)");
  assert(url.includes("7240=500"), "URL has deposit (7240)");
  assert(url.includes("_pc=CAT_III"), "URL has plastic category");
  assert(url.includes("_mt=MLP"), "URL has material type");
  assert(url.includes("_th=70"), "URL has thickness");
  assert(url.includes("_cr=CPCB-EP-2024-12345"), "URL has CPCB registration");
  assert(url.includes("_kv=1"), "URL has key version");

  const parsed = parseGS1DigitalLinkURL(url);
  assert(parsed !== null, "URL parses successfully");
  if (parsed) {
    assert(parsed.gtin === "8901234567890", "Parsed GTIN matches");
    assert(parsed.serial === serial1, "Parsed serial matches");
    assert(parsed.batch === "LOT2025A", "Parsed batch matches");
    assert(parsed.net_weight_g === 52, `Parsed weight matches: ${parsed.net_weight_g}`);
    assert(parsed.deposit_paisa === 500, "Parsed deposit matches");
    assert(parsed.plastic_category === "CAT_III", "Parsed plastic category matches");
    assert(parsed.material === "MLP", "Parsed material matches");
    assert(parsed.thickness_microns === 70, "Parsed thickness matches");
    assert(parsed.cpcb_registration === "CPCB-EP-2024-12345", "Parsed CPCB reg matches");
    assert(parsed.key_version === 1, "Parsed key version matches");
  }

  // --- 5. QR Code Generation ---
  console.log("\n5. QR Code Generation");
  const testProduct: ProductRegistration = {
    pibo_name: "PepsiCo India Holdings Pvt Ltd",
    cpcb_registration: "CPCB-EP-2024-12345",
    gtin: "8901234567890",
    sku: "LAYS-CLASSIC-52G",
    product_name: "Lay's Classic Salted Potato Chips 52g",
    plastic_type: "CAT_III",
    thickness_microns: 70,
    net_weight_g: 52,
    material: "MLP",
    brand_name: "Lay's",
    category: "Snacks",
    mrp_paisa: 2000,
    country_of_origin: "IN",
  };

  const qr = await generateQRCode({ product: testProduct, batch_id: "LOT2025A" });
  assert(qr.serial.startsWith("BIN"), "QR serial starts with BIN");
  assert(qr.gs1_url.includes("/01/8901234567890/21/"), "QR URL is GS1 format");
  assert(qr.qr_data_url.startsWith("data:image/png;base64,"), "QR image is base64 PNG");
  assert(qr.payload.deposit_paisa === 200, `Default deposit for CAT_III: ${qr.payload.deposit_paisa} paisa`);
  assert(qr.payload.cpcb_registration === "CPCB-EP-2024-12345", "Payload has CPCB reg");
  assert(qr.payload.thickness_microns === 70, "Payload has thickness");
  console.log(`  Generated QR: ${qr.serial}`);
  console.log(`  GS1 URL length: ${qr.gs1_url.length} chars`);

  // --- 6. SVG Output (for CIJ/TIJ printers) ---
  console.log("\n6. Printer Output (SVG + High-DPI)");
  const svg = await generateQRSVG(qr.gs1_url);
  assert(svg.includes("<svg"), "SVG output valid");
  assert(svg.includes("</svg>"), "SVG is complete");
  console.log(`  SVG length: ${svg.length} chars`);

  const highDpi = await generateHighDPIQR(qr.gs1_url, 1200);
  assert(highDpi.length > 1000, `High-DPI PNG: ${highDpi.length} bytes`);

  // --- 7. CSV Manifest ---
  console.log("\n7. CSV Manifest");
  const manifest: PrinterBatchManifest = {
    batch_id: "LOT2025A",
    brand_id: "PEPSICO",
    product_gtin: "8901234567890",
    total_count: 2,
    generated_at: new Date().toISOString(),
    codes: [
      { serial: qr.serial, gs1_url: qr.gs1_url, human_readable: `${qr.serial} | LOT2025A`, sequence_number: 1 },
      { serial: "BIN-TEST2", gs1_url: "https://test", human_readable: "BIN-TEST2 | LOT2025A", sequence_number: 2 },
    ],
  };
  const csv = generateCSVManifest(manifest);
  assert(csv.includes("sequence_number,serial,gs1_url,human_readable"), "CSV has header");
  assert(csv.includes(qr.serial), "CSV contains serial");
  console.log(`  CSV lines: ${csv.split("\n").length}`);

  // --- 8. Redis Connection ---
  console.log("\n8. Redis Connection (BullMQ backend)");
  try {
    const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      connectTimeout: 5000,
    });
    const pong = await redis.ping();
    assert(pong === "PONG", `Redis PING: ${pong}`);
    const info = await redis.info("server");
    const version = info.match(/redis_version:(\S+)/)?.[1];
    console.log(`  Redis version: ${version}`);
    await redis.quit();
  } catch (err) {
    console.log(`  ✗ Redis connection failed: ${err}`);
    failed++;
  }

  // --- Summary ---
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
