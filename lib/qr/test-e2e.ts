/**
 * FULL END-TO-END TEST
 * Hits real Supabase (cloud) + real Redis (cloud) + all library functions.
 *
 * Run: npx tsx lib/qr/test-e2e.ts
 */

import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import IORedis from "ioredis";
import { generateSerial, signPayload, verifySignature, buildGS1DigitalLinkURL, parseGS1DigitalLinkURL, getCurrentKeyVersion, validateGTIN } from "./crypto";
import { generateQRCode } from "./generator";
import { generateQRSVG, generateHighDPIQR, generateCSVManifest } from "./printer";
import type { ProductRegistration, PrinterBatchManifest } from "./types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) { console.log(`  ✓ ${name}`); passed++; }
  else { console.log(`  ✗ ${name}`); failed++; }
}

async function main() {
  console.log("=== BIN QR — Full End-to-End Test ===\n");

  // ============================================================
  // 1. SUPABASE CONNECTION
  // ============================================================
  console.log("1. Supabase Connection");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify tables exist
  const { error: prErr } = await supabase.from("product_registrations").select("gtin").limit(1);
  assert(!prErr, `product_registrations table accessible (${prErr?.message || "ok"})`);

  const { error: qrErr } = await supabase.from("qr_codes").select("id").limit(1);
  assert(!qrErr, `qr_codes table accessible (${qrErr?.message || "ok"})`);

  // ============================================================
  // 2. REDIS CONNECTION
  // ============================================================
  console.log("\n2. Redis Connection");
  let redis: IORedis | null = null;
  try {
    redis = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null, connectTimeout: 5000 });
    const pong = await redis.ping();
    assert(pong === "PONG", `Redis PING: ${pong}`);
  } catch (err) {
    console.log(`  ✗ Redis failed: ${err}`);
    failed++;
  }

  // ============================================================
  // 3. PRODUCT REGISTRATION (Step 1 of pipeline)
  // ============================================================
  console.log("\n3. Product Registration → Supabase");

  const testProduct: ProductRegistration & { brand_id: string } = {
    brand_id: "PEPSICO_TEST",
    pibo_name: "PepsiCo India Holdings Pvt Ltd",
    cpcb_registration: "CPCB-EP-2024-TEST",
    gtin: "8901234567893",  // Test GTIN
    sku: "LAYS-CLASSIC-52G-TEST",
    product_name: "Lay's Classic Salted Potato Chips 52g (TEST)",
    plastic_type: "CAT_III",
    thickness_microns: 70,
    net_weight_g: 52,
    material: "MLP",
    brand_name: "Lay's",
    category: "Snacks",
    mrp_paisa: 2000,
    country_of_origin: "IN",
  };

  // Upsert product
  const { error: regErr } = await supabase
    .from("product_registrations")
    .upsert(testProduct, { onConflict: "gtin" });
  assert(!regErr, `Product registered (${regErr?.message || "ok"})`);

  // Read it back
  const { data: regData, error: regReadErr } = await supabase
    .from("product_registrations")
    .select("*")
    .eq("gtin", testProduct.gtin)
    .single();
  assert(!regReadErr && regData?.pibo_name === testProduct.pibo_name, "Product read back matches");
  assert(regData?.cpcb_registration === "CPCB-EP-2024-TEST", "CPCB registration stored");
  assert(regData?.thickness_microns === 70, "Thickness stored");
  assert(regData?.plastic_type === "CAT_III", "Plastic category stored");

  // ============================================================
  // 4. QR CODE GENERATION (Step 2 of pipeline)
  // ============================================================
  console.log("\n4. QR Code Generation → GS1 Digital Link");

  const qr = await generateQRCode({ product: testProduct, batch_id: "TESTLOT001" });

  assert(qr.serial.startsWith("BIN"), `Serial: ${qr.serial}`);
  assert(qr.gs1_url.includes("/01/8901234567893/21/"), "GS1 URL has /01/{GTIN}/21/{serial}");
  assert(qr.gs1_url.includes("_cr=CPCB-EP-2024-TEST"), "URL has CPCB reg");
  assert(qr.gs1_url.includes("_th=70"), "URL has thickness");
  assert(qr.gs1_url.includes("_pc=CAT_III"), "URL has plastic category");
  assert(qr.gs1_url.includes("_mt=MLP"), "URL has material");
  assert(qr.gs1_url.includes("10=TESTLOT001"), "URL has batch");
  assert(qr.qr_data_url.startsWith("data:image/png;base64,"), "QR image is base64 PNG");

  // Parse the URL back
  const parsed = parseGS1DigitalLinkURL(qr.gs1_url);
  assert(parsed !== null, "GS1 URL parses back");
  assert(parsed?.gtin === "8901234567893", "Round-trip: GTIN matches");
  assert(parsed?.serial === qr.serial, "Round-trip: serial matches");
  assert(parsed?.cpcb_registration === "CPCB-EP-2024-TEST", "Round-trip: CPCB matches");
  assert(parsed?.thickness_microns === 70, "Round-trip: thickness matches");

  // Verify HMAC
  const { signature, ...payloadNoSig } = qr.payload;
  assert(verifySignature(payloadNoSig as unknown as Record<string, unknown>, signature), "HMAC verifies");

  // ============================================================
  // 5. INSERT QR CODE INTO SUPABASE (Step 2 continued)
  // ============================================================
  console.log("\n5. QR Code → Supabase Insert");

  const { error: insertErr } = await supabase.from("qr_codes").insert({
    serial: qr.serial,
    gs1_url: qr.gs1_url,
    payload: qr.payload,
    status: "active",
    deposit_paisa: qr.payload.deposit_paisa,
    brand_id: testProduct.brand_id,
    product_gtin: testProduct.gtin,
    batch_id: "TESTLOT001",
    plastic_category: testProduct.plastic_type,
    material: testProduct.material,
    thickness_microns: testProduct.thickness_microns,
    cpcb_registration: testProduct.cpcb_registration,
    created_by: "e2e-test",
  });
  assert(!insertErr, `QR inserted (${insertErr?.message || "ok"})`);

  // Read it back
  const { data: qrData, error: qrReadErr } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("serial", qr.serial)
    .single();
  assert(!qrReadErr && qrData?.status === "active", "QR status is 'active'");
  assert(qrData?.deposit_paisa === 200, `Deposit: ${qrData?.deposit_paisa} paisa (CAT_III default)`);
  assert(qrData?.brand_id === "PEPSICO_TEST", "Brand ID stored");
  assert(qrData?.cpcb_registration === "CPCB-EP-2024-TEST", "CPCB reg stored in QR record");

  // ============================================================
  // 6. VALIDATE QR CODE (Step 4 of pipeline)
  // ============================================================
  console.log("\n6. QR Validation (lookup + HMAC check)");

  // Simulate scanner: parse the GS1 URL, extract serial, look up in DB
  const scannedUrl = qr.gs1_url;
  const scannedData = parseGS1DigitalLinkURL(scannedUrl);
  assert(scannedData !== null, "Scanner parses GS1 URL");

  const { data: lookupData } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("serial", scannedData!.serial)
    .single();
  assert(lookupData?.status === "active", "Lookup: status is active");

  // Verify HMAC from DB payload
  const dbPayload = lookupData?.payload;
  const { signature: dbSig, ...dbPayloadNoSig } = dbPayload;
  const tamperOk = verifySignature(dbPayloadNoSig as Record<string, unknown>, dbSig);
  assert(tamperOk, "HMAC from DB payload verifies (not tampered)");

  // Tamper test: modify payload, should fail
  const tamperedPayload = { ...dbPayloadNoSig, deposit_paisa: 99999 };
  const tamperFail = verifySignature(tamperedPayload as Record<string, unknown>, dbSig);
  assert(!tamperFail, "Tampered payload correctly rejected");

  // ============================================================
  // 7. REDEEM QR CODE (Step 5 of pipeline)
  // ============================================================
  console.log("\n7. QR Redemption (one-time-use)");

  // Redeem
  const { data: redeemData, error: redeemErr } = await supabase
    .from("qr_codes")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
      redeemed_by: "test-picker@upi",
      redeemed_at_location: { lat: 26.7271, lng: 88.3953, collection_type: "kirana" },
    })
    .eq("serial", qr.serial)
    .eq("status", "active")  // Atomic: only if still active
    .select("id, serial, deposit_paisa, status")
    .single();
  assert(!redeemErr, `Redeemed (${redeemErr?.message || "ok"})`);
  assert(redeemData?.status === "redeemed", "Status is now 'redeemed'");
  assert(redeemData?.deposit_paisa === 200, `Deposit to refund: ${redeemData?.deposit_paisa} paisa`);

  // Try to redeem AGAIN — should fail (one-time-use)
  const { data: doubleRedeem, error: doubleErr } = await supabase
    .from("qr_codes")
    .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
    .eq("serial", qr.serial)
    .eq("status", "active")  // This won't match — already redeemed
    .select("id")
    .single();
  assert(doubleRedeem === null || doubleErr !== null, "Double redemption blocked (one-time-use)");

  // Verify final state
  const { data: finalData } = await supabase
    .from("qr_codes")
    .select("status, redeemed_by, redeemed_at_location")
    .eq("serial", qr.serial)
    .single();
  assert(finalData?.status === "redeemed", "Final status: redeemed");
  assert(finalData?.redeemed_by === "test-picker@upi", "Redeemed by recorded");
  assert(finalData?.redeemed_at_location?.collection_type === "kirana", "Collection type recorded");

  // ============================================================
  // 8. PRINTER OUTPUT (Step 3 of pipeline)
  // ============================================================
  console.log("\n8. Printer Output (SVG + High-DPI + CSV)");

  const svg = await generateQRSVG(qr.gs1_url);
  assert(svg.includes("<svg") && svg.includes("</svg>"), `SVG valid (${svg.length} chars)`);

  const highDpi = await generateHighDPIQR(qr.gs1_url, 1200);
  assert(highDpi.length > 10000, `High-DPI PNG: ${(highDpi.length / 1024).toFixed(0)} KB`);

  const manifest: PrinterBatchManifest = {
    batch_id: "TESTLOT001",
    brand_id: "PEPSICO_TEST",
    product_gtin: "8901234567893",
    total_count: 1,
    generated_at: new Date().toISOString(),
    codes: [{ serial: qr.serial, gs1_url: qr.gs1_url, human_readable: `${qr.serial} | TESTLOT001`, sequence_number: 1 }],
  };
  const csv = generateCSVManifest(manifest);
  assert(csv.includes("sequence_number,serial,gs1_url,human_readable"), "CSV header correct");
  assert(csv.includes(qr.serial), "CSV has serial");

  // ============================================================
  // 9. CLEANUP TEST DATA
  // ============================================================
  console.log("\n9. Cleanup");
  await supabase.from("qr_codes").delete().eq("serial", qr.serial);
  await supabase.from("product_registrations").delete().eq("gtin", "8901234567893");
  console.log("  ✓ Test data cleaned up");

  if (redis) await redis.quit();

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log(`\n${"=".repeat(50)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log(`${"=".repeat(50)}`);

  if (failed === 0) {
    console.log("\nFull pipeline verified end-to-end:");
    console.log("  1. Product Registration → Supabase ✓");
    console.log("  2. QR Generation (GS1 Digital Link, HMAC-signed) ✓");
    console.log("  3. Printer Output (SVG, 600 DPI PNG, CSV manifest) ✓");
    console.log("  4. Validation (parse GS1 URL, HMAC verify, DB lookup) ✓");
    console.log("  5. Redemption (atomic one-time-use, double-redeem blocked) ✓");
    console.log("  + Redis connection ✓");
    console.log("  + Supabase cloud ✓");
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
