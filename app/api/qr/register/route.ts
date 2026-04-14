import { NextRequest, NextResponse } from "next/server";
import { ProductRegistrationSchema } from "@/lib/qr/schema";
import { upsertProductRegistration } from "@/data-access/qr";
import { validateGTIN } from "@/lib/qr/crypto";

/**
 * POST /api/qr/register
 *
 * Register a product SKU with all Rule 11A mandatory fields.
 * Must be called before generating QR codes for a product.
 *
 * Rule 11A requires:
 *   - PIBO name (Producer/Importer/Brand Owner)
 *   - CPCB registration number
 *   - Product SKU details
 *   - Plastic type and thickness
 *   - Batch/lot information (per-batch, not per-SKU — provided at generation time)
 *
 * Input: {
 *   pibo_name: "PepsiCo India Holdings Pvt Ltd",
 *   cpcb_registration: "CPCB-EP-2024-12345",
 *   gtin: "8901234567890",
 *   sku: "LAYS-CLASSIC-52G",
 *   product_name: "Lay's Classic Salted Potato Chips 52g",
 *   plastic_type: "CAT_III",    // Multilayer (MLP)
 *   thickness_microns: 70,       // 70 microns
 *   net_weight_g: 52,
 *   material: "MLP",
 *   brand_name: "Lay's",        // Optional
 *   category: "Snacks",         // Optional
 *   mrp_paisa: 2000,            // Rs 20 = 2000 paisa — Optional
 *   country_of_origin: "IN"     // Optional
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ProductRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid product registration", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Validate GTIN check digit (barcoder library)
    const gtinCheck = validateGTIN(parsed.data.gtin);
    if (!gtinCheck.valid) {
      return NextResponse.json(
        { error: "Invalid GTIN", details: gtinCheck.error },
        { status: 400 }
      );
    }

    const brand_id = request.headers.get("x-api-key") || body.brand_id || "anonymous";

    const { data, error } = await upsertProductRegistration({
      ...parsed.data,
      brand_id,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({
      registered: true,
      gtin: parsed.data.gtin,
      product_name: parsed.data.product_name,
      rule_11a_compliant: true,
      fields_encoded: [
        "pibo_name",
        "cpcb_registration",
        "sku",
        "plastic_type",
        "thickness_microns",
        "material",
        "net_weight_g",
      ],
    });
  } catch (error) {
    console.error("Product registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
