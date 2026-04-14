import { NextRequest, NextResponse } from "next/server";
import { getProductRegistration } from "@/data-access/qr";
import { createClient } from "@/utils/supabase/server";
import { generateCSVManifest, generatePrintSheetPDF } from "@/lib/qr/printer";
import type { PrinterBatchManifest } from "@/lib/qr/types";

/**
 * GET /api/qr/manifest?batch_id=xxx&format=csv|pdf
 *
 * Download a printer-ready manifest for a batch of generated QR codes.
 *
 * Formats:
 *   csv — CSV with columns: sequence_number, serial, gs1_url, human_readable
 *         Import into: Domino QuickDesign, Videojet CLARiTY, Markem-Imaje CoLOS
 *
 *   pdf — A4 print sheet with QR code grid (4 columns)
 *         For: sticker labels, manual application, small brands without CIJ/TIJ
 *
 * The CSV manifest is what CIJ/TIJ printer operators consume on the factory floor.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batch_id = searchParams.get("batch_id");
    const format = searchParams.get("format") || "csv";

    if (!batch_id) {
      return NextResponse.json({ error: "Provide batch_id query parameter" }, { status: 400 });
    }

    // Fetch all QR codes for this batch
    const supabase = createClient();
    const { data: codes, error } = await supabase
      .from("qr_codes")
      .select("serial, gs1_url, brand_id, product_gtin")
      .eq("batch_id", batch_id)
      .order("generated_at", { ascending: true });

    if (error || !codes || codes.length === 0) {
      return NextResponse.json({ error: "Batch not found or empty" }, { status: 404 });
    }

    const brand_id = codes[0].brand_id;
    const product_gtin = codes[0].product_gtin;

    if (format === "csv") {
      const manifest: PrinterBatchManifest = {
        batch_id,
        brand_id,
        product_gtin,
        total_count: codes.length,
        generated_at: new Date().toISOString(),
        codes: codes.map((c, i) => ({
          serial: c.serial,
          gs1_url: c.gs1_url,
          human_readable: `${c.serial} | ${batch_id}`,
          sequence_number: i + 1,
        })),
      };

      const csv = generateCSVManifest(manifest);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="BIN-manifest-${batch_id}.csv"`,
        },
      });
    }

    if (format === "pdf") {
      const product = await getProductRegistration(product_gtin);
      if (!product) {
        return NextResponse.json({ error: "Product registration not found" }, { status: 404 });
      }

      const pdfBytes = await generatePrintSheetPDF(
        codes.map((c) => ({ serial: c.serial, gs1_url: c.gs1_url })),
        product,
        batch_id
      );

      return new NextResponse(pdfBytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="BIN-printsheet-${batch_id}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format. Use csv or pdf." }, { status: 400 });
  } catch (error) {
    console.error("Manifest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
