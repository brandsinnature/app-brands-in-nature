import { NextRequest, NextResponse } from "next/server";
import { getQRBySerial, redeemQRCode } from "@/data-access/qr";
import { verifySignature, parseGS1DigitalLinkURL } from "@/lib/qr/crypto";
import { recordScanEvent, getRecentScansForSerial } from "@/lib/qr/scan-events";
import { detectAnomalies } from "@/lib/qr/antiforgery";
import { checkRedemptionLimits } from "@/lib/qr/ratelimit";

/**
 * POST /api/scan/event
 *
 * Universal scan endpoint. Records EVERY scan in the audit trail,
 * runs anomaly detection, and optionally redeems.
 *
 * Input:
 *   { serial | url, actor_id, actor_type, location?, event_type?, device_fingerprint?, metadata? }
 *
 * event_type:
 *   "scan"   — just looking (validate + audit trail)
 *   "redeem" — claim deposit (validate + redeem + audit trail)
 *   "verify" — print quality check (from inline scanner on production line)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Parse serial from URL or direct
    let serial = body.serial;
    if (body.url && !serial) {
      const parsed = parseGS1DigitalLinkURL(body.url);
      if (!parsed) {
        return NextResponse.json({ error: "Invalid QR URL" }, { status: 400 });
      }
      serial = parsed.serial;
    }
    if (!serial) {
      return NextResponse.json({ error: "Provide serial or url" }, { status: 400 });
    }

    const actorId = body.actor_id || "anonymous";
    const actorType = body.actor_type || "consumer";
    const eventType = body.event_type || "scan";

    // Look up QR code
    const qr = await getQRBySerial(serial);
    if (!qr) {
      await recordScanEvent({
        event_type: eventType,
        qr_serial: serial,
        actor_id: actorId,
        actor_type: actorType,
        location: body.location,
        ip_address: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
        outcome: "failure",
        device_fingerprint: body.device_fingerprint,
        metadata: { reason: "serial_not_found" },
      });
      return NextResponse.json({ valid: false, error: "QR not found" }, { status: 404 });
    }

    // HMAC tamper check
    const { signature, ...payloadNoSig } = qr.payload;
    const tamperOk = verifySignature(payloadNoSig as unknown as Record<string, unknown>, signature);

    if (!tamperOk) {
      await recordScanEvent({
        event_type: eventType,
        qr_serial: serial,
        product_gtin: qr.product_gtin,
        batch_id: qr.batch_id,
        brand_id: qr.brand_id,
        actor_id: actorId,
        actor_type: actorType,
        outcome: "tampered",
        previous_status: qr.status,
        new_status: qr.status,
        device_fingerprint: body.device_fingerprint,
      });
      return NextResponse.json({ valid: false, error: "Tampered QR code" }, { status: 403 });
    }

    // Anomaly detection
    const recentScans = await getRecentScansForSerial(serial, 10);
    const anomaly = detectAnomalies(
      {
        serial,
        device_fingerprint: body.device_fingerprint || "unknown",
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
        geo_lat: body.location?.lat || 0,
        geo_lng: body.location?.lng || 0,
        scanned_at: new Date(),
      },
      recentScans.map((s: Record<string, unknown>) => ({
        serial: s.qr_serial as string,
        device_fingerprint: (s.device_fingerprint as string) || "unknown",
        ip_address: (s.ip_address as string) || "unknown",
        geo_lat: (s.location as Record<string, number>)?.lat || 0,
        geo_lng: (s.location as Record<string, number>)?.lng || 0,
        scanned_at: new Date(s.created_at as string),
      }))
    );

    // Redeem flow
    if (eventType === "redeem") {
      if (qr.status !== "active") {
        await recordScanEvent({
          event_type: "redeem",
          qr_serial: serial,
          product_gtin: qr.product_gtin,
          batch_id: qr.batch_id,
          brand_id: qr.brand_id,
          actor_id: actorId,
          actor_type: actorType,
          outcome: "duplicate",
          deposit_paisa: qr.deposit_paisa,
          previous_status: qr.status,
          new_status: qr.status,
          device_fingerprint: body.device_fingerprint,
        });
        return NextResponse.json({
          valid: false,
          status: qr.status,
          error: `Already ${qr.status}`,
        }, { status: 409 });
      }

      // Rate limit
      const limitCheck = await checkRedemptionLimits({
        userId: actorId,
        serial,
        collectionPointId: body.location?.collection_point_id,
      });
      if (!limitCheck.allowed) {
        return NextResponse.json({ valid: false, error: limitCheck.error }, { status: 429 });
      }

      // Atomic redeem
      const { error } = await redeemQRCode({
        serial,
        redeemed_by: actorId,
        location: body.location,
      });

      if (error) {
        return NextResponse.json({ valid: false, error }, { status: 500 });
      }

      await recordScanEvent({
        event_type: "redeem",
        qr_serial: serial,
        product_gtin: qr.product_gtin,
        batch_id: qr.batch_id,
        brand_id: qr.brand_id,
        actor_id: actorId,
        actor_type: actorType,
        location: body.location,
        ip_address: request.headers.get("x-forwarded-for") || undefined,
        user_agent: request.headers.get("user-agent") || undefined,
        outcome: "success",
        deposit_paisa: qr.deposit_paisa,
        previous_status: "active",
        new_status: "redeemed",
        device_fingerprint: body.device_fingerprint,
      });

      return NextResponse.json({
        valid: true,
        status: "redeemed",
        deposit_paisa: qr.deposit_paisa,
        anomaly: anomaly.suspicious ? anomaly : undefined,
      });
    }

    // Scan-only (no redeem)
    await recordScanEvent({
      event_type: eventType,
      qr_serial: serial,
      product_gtin: qr.product_gtin,
      batch_id: qr.batch_id,
      brand_id: qr.brand_id,
      actor_id: actorId,
      actor_type: actorType,
      location: body.location,
      ip_address: request.headers.get("x-forwarded-for") || undefined,
      user_agent: request.headers.get("user-agent") || undefined,
      outcome: qr.status === "active" ? "success" : "expired",
      deposit_paisa: qr.deposit_paisa,
      previous_status: qr.status,
      new_status: qr.status,
      device_fingerprint: body.device_fingerprint,
    });

    return NextResponse.json({
      valid: qr.status === "active",
      status: qr.status,
      deposit_paisa: qr.deposit_paisa,
      product: {
        gtin: qr.product_gtin,
        brand_id: qr.brand_id,
        material: qr.material,
        plastic_category: qr.plastic_category,
      },
      anomaly: anomaly.suspicious ? anomaly : undefined,
    });
  } catch (error) {
    console.error("Scan event error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
