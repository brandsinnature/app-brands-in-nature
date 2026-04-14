import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GS1 Digital Link Resolver — JSON API
 *
 * GET /01/{GTIN}/21/{serial}
 *
 * When Accept: application/json → returns product + deposit data as JSON
 * When Accept: text/html (browser) → Next.js renders page.tsx instead
 *
 * This fulfills GS1-Conformant Resolver Standard 1.0:
 *   - Content negotiation via Accept header
 *   - Returns structured data for machine clients
 *   - CORS headers for cross-origin access
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gtin: string; serial: string }> }
) {
  const { gtin, serial } = await params;
  const accept = request.headers.get("accept") || "";

  // If browser request, let page.tsx handle it
  if (accept.includes("text/html") && !accept.includes("application/json")) {
    return NextResponse.next();
  }

  const supabase = createClient();

  const { data: qrRecord } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("serial", serial)
    .single();

  const { data: product } = await supabase
    .from("product_registrations")
    .select("*")
    .eq("gtin", gtin)
    .single();

  if (!qrRecord) {
    return NextResponse.json({ error: "QR code not found" }, {
      status: 404,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  return NextResponse.json({
    serial: qrRecord.serial,
    status: qrRecord.status,
    deposit_paisa: qrRecord.deposit_paisa,
    product: product ? {
      gtin: product.gtin,
      product_name: product.product_name,
      pibo_name: product.pibo_name,
      brand_name: product.brand_name,
      material: product.material,
      plastic_type: product.plastic_type,
      thickness_microns: product.thickness_microns,
      net_weight_g: product.net_weight_g,
      cpcb_registration: product.cpcb_registration,
      sku: product.sku,
    } : null,
    batch_id: qrRecord.batch_id,
    generated_at: qrRecord.generated_at,
    redeemed_at: qrRecord.redeemed_at,
    redeemed_by: qrRecord.redeemed_by,
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
