import { NextRequest, NextResponse } from "next/server";
import { getQRBySerial, getQRStats } from "@/data-access/qr";

// GET /api/qr/status?serial=xxx — Check status of a single QR code
// GET /api/qr/status?brand_id=xxx — Get aggregate stats for a brand
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serial = searchParams.get("serial");
    const brand_id = searchParams.get("brand_id");

    if (serial) {
      const record = await getQRBySerial(serial);
      if (!record) {
        return NextResponse.json({ error: "QR code not found" }, { status: 404 });
      }

      return NextResponse.json({
        serial: record.serial,
        status: record.status,
        deposit_paisa: record.deposit_paisa,
        brand_id: record.brand_id,
        product_gtin: record.product_gtin,
        material: record.material,
        plastic_category: record.plastic_category,
        thickness_microns: record.thickness_microns,
        cpcb_registration: record.cpcb_registration,
        batch_id: record.batch_id,
        generated_at: record.generated_at,
        redeemed_at: record.redeemed_at,
        redeemed_by: record.redeemed_by,
        redeemed_at_location: record.redeemed_at_location,
      });
    }

    if (brand_id) {
      const { data, error } = await getQRStats(brand_id);
      if (error) {
        return NextResponse.json({ error }, { status: 500 });
      }
      return NextResponse.json({ brand_id, stats: data });
    }

    return NextResponse.json({ error: "Provide serial or brand_id query parameter" }, { status: 400 });
  } catch (error) {
    console.error("QR status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
