import { NextRequest, NextResponse } from "next/server";
import { ValidateSchema, RedeemSchema } from "@/lib/qr/schema";
import { getQRBySerial, redeemQRCode } from "@/data-access/qr";
import { verifySignature, parseGS1DigitalLinkURL } from "@/lib/qr/crypto";
import { checkRedemptionLimits } from "@/lib/qr/ratelimit";

/**
 * POST /api/qr/validate
 *
 * Validate a scanned QR code. Two modes:
 *
 * 1. Validate only: { serial: "BIN-..." }
 *    → Returns validity, deposit value, product info, tamper check
 *
 * 2. Validate + Redeem: { serial: "BIN-...", redeemed_by: "upi@bank", location: {...} }
 *    → Validates, redeems (marks as used), returns deposit info for UPI payout
 *    → A redeemed code can never be redeemed again (one-time-use, Goa DRS USI compliant)
 *
 * The validate endpoint also accepts a GS1 Digital Link URL (what's actually in the QR):
 *   { url: "https://bin.eco/01/8901234567890/21/BIN-abc123?..." }
 *   → Parses the URL, extracts serial, validates against database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // If a full URL is provided (from QR scan), parse it first
    let serial = body.serial;
    if (body.url && !serial) {
      const parsed = parseGS1DigitalLinkURL(body.url);
      if (!parsed) {
        return NextResponse.json({ valid: false, error: "Invalid QR code URL format" }, { status: 400 });
      }
      serial = parsed.serial;
    }

    if (!serial) {
      return NextResponse.json({ valid: false, error: "Provide serial or url" }, { status: 400 });
    }

    // Look up the QR code
    const record = await getQRBySerial(serial);
    if (!record) {
      return NextResponse.json({ valid: false, error: "QR code not found" }, { status: 404 });
    }

    // Verify HMAC signature (tamper detection)
    // Uses key version from payload for rotation support
    const { signature, ...payloadWithoutSig } = record.payload;
    const keyVersion = (record.payload as unknown as Record<string, unknown>).key_version as number | undefined;
    const tamperCheck = verifySignature(
      payloadWithoutSig as unknown as Record<string, unknown>,
      signature,
      keyVersion
    )
      ? "passed"
      : "failed";

    // If redeemed_by is present, this is a redeem request
    if (body.redeemed_by) {
      const parsed = RedeemSchema.safeParse({ serial, ...body });
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid redeem request", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      if (record.status !== "active") {
        return NextResponse.json(
          {
            valid: false,
            status: record.status,
            error: `QR code already ${record.status}`,
            redeemed_at: record.redeemed_at,
          },
          { status: 409 }
        );
      }

      if (tamperCheck === "failed") {
        return NextResponse.json({ valid: false, error: "Tampered QR code detected" }, { status: 403 });
      }

      // Rate limiting: prevent abuse (rapid retries, excessive redemptions)
      const limitCheck = await checkRedemptionLimits({
        userId: parsed.data.redeemed_by,
        serial,
        collectionPointId: parsed.data.location?.collection_point_id,
      });
      if (!limitCheck.allowed) {
        return NextResponse.json({ valid: false, error: limitCheck.error }, { status: 429 });
      }

      const { error } = await redeemQRCode({
        serial,
        redeemed_by: parsed.data.redeemed_by,
        location: parsed.data.location,
      });

      if (error) {
        return NextResponse.json({ valid: false, error }, { status: 500 });
      }

      return NextResponse.json({
        valid: true,
        status: "redeemed",
        serial: record.serial,
        deposit_paisa: record.deposit_paisa,
        product: {
          gtin: record.product_gtin,
          brand_id: record.brand_id,
          material: record.material,
          plastic_category: record.plastic_category,
          net_weight_g: record.payload.net_weight_g,
        },
        tamper_check: tamperCheck,
      });
    }

    // Validate only (no redeem)
    return NextResponse.json({
      valid: tamperCheck === "passed" && record.status === "active",
      status: record.status,
      serial: record.serial,
      deposit_paisa: record.deposit_paisa,
      product: {
        gtin: record.product_gtin,
        brand_id: record.brand_id,
        material: record.material,
        plastic_category: record.plastic_category,
        net_weight_g: record.payload.net_weight_g,
      },
      generated_at: record.generated_at,
      redeemed_at: record.redeemed_at,
      tamper_check: tamperCheck,
    });
  } catch (error) {
    console.error("QR validate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
