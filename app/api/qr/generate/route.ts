import { NextRequest, NextResponse } from "next/server";
import { GenerateSchema } from "@/lib/qr/schema";
import { generateQRCode, generateBatch } from "@/lib/qr/generator";
import { getProductRegistration, insertQRCodes } from "@/data-access/qr";

/**
 * POST /api/qr/generate
 *
 * Generate serialized, GS1 Digital Link + Rule 11A compliant QR codes.
 *
 * Input: { brand_id, product_gtin, batch_id, count?, deposit_paisa? }
 * - product_gtin must be pre-registered via /api/qr/register (with PIBO name, CPCB reg, thickness, etc.)
 * - All Rule 11A fields come from the product registration, not per-QR request
 *
 * Output: { qr_codes: [{ serial, gs1_url, qr_data_url, payload }], printer_manifest?: [...] }
 * - gs1_url: GS1 Digital Link URL (what gets encoded in the QR / printed by CIJ/TIJ printers)
 * - qr_data_url: base64 PNG image
 * - printer_manifest: for streaming to production line printers (serial, gs1_url, human_readable, sequence)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = GenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { brand_id, product_gtin, batch_id, count, deposit_paisa } = parsed.data;
    const created_by = request.headers.get("x-api-key") || "anonymous";

    // Look up product registration (contains Rule 11A mandatory fields)
    const product = await getProductRegistration(product_gtin);
    if (!product) {
      return NextResponse.json(
        {
          error: "Product not registered",
          message: `GTIN ${product_gtin} not found. Register product first via POST /api/qr/register with Rule 11A fields (PIBO name, CPCB registration, plastic type, thickness).`,
        },
        { status: 404 }
      );
    }

    if (count === 1) {
      const qr = await generateQRCode({
        product,
        batch_id,
        deposit_override: deposit_paisa,
      });

      const { error } = await insertQRCodes([
        {
          serial: qr.serial,
          gs1_url: qr.gs1_url,
          payload: qr.payload,
          deposit_paisa: qr.payload.deposit_paisa,
          brand_id,
          product_gtin,
          batch_id,
          plastic_category: product.plastic_type,
          material: product.material,
          thickness_microns: product.thickness_microns,
          cpcb_registration: product.cpcb_registration,
          created_by,
        },
      ]);

      if (error) {
        return NextResponse.json({ error }, { status: 500 });
      }

      return NextResponse.json({
        qr_codes: [
          {
            serial: qr.serial,
            gs1_url: qr.gs1_url,
            qr_data_url: qr.qr_data_url,
            payload: qr.payload,
          },
        ],
        batch_id,
        count: 1,
      });
    }

    // Batch generation
    const { codes, printer_manifest } = await generateBatch({
      product,
      batch_id,
      count,
      deposit_override: deposit_paisa,
    });

    const { error } = await insertQRCodes(
      codes.map((qr) => ({
        serial: qr.serial,
        gs1_url: qr.gs1_url,
        payload: qr.payload,
        deposit_paisa: qr.payload.deposit_paisa,
        brand_id,
        product_gtin,
        batch_id,
        plastic_category: product.plastic_type,
        material: product.material,
        thickness_microns: product.thickness_microns,
        cpcb_registration: product.cpcb_registration,
        created_by,
      }))
    );

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({
      qr_codes: codes.map((qr) => ({
        serial: qr.serial,
        gs1_url: qr.gs1_url,
        qr_data_url: qr.qr_data_url,
        payload: qr.payload,
      })),
      batch_id,
      count,
      printer_manifest,
    });
  } catch (error) {
    console.error("QR generate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
