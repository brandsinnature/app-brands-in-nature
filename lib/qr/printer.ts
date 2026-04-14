import QRCode from "qrcode";
import sharp from "sharp";
import { PDFDocument, StandardFonts } from "pdf-lib";
import type { PrinterStreamItem, PrinterBatchManifest, ProductRegistration } from "./types";

// --- SVG Output for CIJ/TIJ Printers ---
// CIJ (Continuous Inkjet) and TIJ (Thermal Inkjet) printers need vector input.
// SVG scales to any resolution without quality loss.
// Production line speeds: 40-300+ m/min. QR must be perfect at any print speed.

export async function generateQRSVG(gs1_url: string): Promise<string> {
  return QRCode.toString(gs1_url, {
    type: "svg",
    errorCorrectionLevel: "H", // 30% recovery — handles wear on production lines
    margin: 4,                  // ISO minimum quiet zone
  });
}

// --- High-DPI Raster Output ---
// Some printers need raster PNG/TIFF at exact DPI.
// Standard: 600 DPI minimum (per Rule 11A print resolution requirement).
// For a 1-inch QR code at 600 DPI = 600×600 pixels.
// For a 2-inch QR code at 600 DPI = 1200×1200 pixels.

export async function generateHighDPIQR(
  gs1_url: string,
  sizePx: number = 1200 // Default: 2-inch at 600 DPI
): Promise<Buffer> {
  const svg = await generateQRSVG(gs1_url);
  return sharp(Buffer.from(svg))
    .resize(sizePx, sizePx, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png({ quality: 100, compressionLevel: 0 }) // Lossless for print
    .toBuffer();
}

// --- CSV Manifest ---
// Most CIJ/TIJ printers accept CSV + image folder as input.
// Format: sequence, serial, gs1_url, human_readable
// Printer operator imports into: Domino QuickDesign, Videojet CLARiTY, Markem-Imaje CoLOS

export function generateCSVManifest(manifest: PrinterBatchManifest): string {
  const header = "sequence_number,serial,gs1_url,human_readable";
  const rows = manifest.codes.map(
    (c) => `${c.sequence_number},"${c.serial}","${c.gs1_url}","${c.human_readable}"`
  );
  return [header, ...rows].join("\n");
}

// --- PDF Print Sheet ---
// Grid of QR codes for sheet printing (not inline production).
// Used for: sticker labels, manual application, small brands without CIJ/TIJ.
// Layout: 4 columns × N rows, each cell = QR code + serial text below.

export async function generatePrintSheetPDF(
  codes: Array<{ serial: string; gs1_url: string }>,
  product: ProductRegistration,
  batch_id: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  // Page setup: A4 (595.28 × 841.89 points)
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const cols = 4;
  const cellWidth = (pageWidth - 2 * margin) / cols;
  const cellHeight = 130; // QR (100px) + text (30px)
  const rowsPerPage = Math.floor((pageHeight - 2 * margin - 40) / cellHeight); // -40 for header

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Header
  page.drawText(`BIN QR Batch: ${batch_id}`, {
    x: margin,
    y: pageHeight - margin,
    size: 12,
    font: fontBold,
  });
  page.drawText(`Product: ${product.product_name} | GTIN: ${product.gtin} | PIBO: ${product.pibo_name}`, {
    x: margin,
    y: pageHeight - margin - 16,
    size: 8,
    font,
  });
  page.drawText(`Material: ${product.material} | Cat: ${product.plastic_type} | Thickness: ${product.thickness_microns}μm | CPCB: ${product.cpcb_registration}`, {
    x: margin,
    y: pageHeight - margin - 28,
    size: 8,
    font,
  });

  let currentRow = 0;
  let currentCol = 0;
  const startY = pageHeight - margin - 50;

  for (let i = 0; i < codes.length; i++) {
    if (currentRow >= rowsPerPage) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      currentRow = 0;
      currentCol = 0;
    }

    const x = margin + currentCol * cellWidth;
    const y = startY - currentRow * cellHeight;

    // Generate QR PNG for embedding
    const qrPng = await sharp(
      Buffer.from(
        await QRCode.toString(codes[i].gs1_url, {
          type: "svg",
          errorCorrectionLevel: "H",
          margin: 2,
        })
      )
    )
      .resize(90, 90)
      .png()
      .toBuffer();

    const qrImage = await pdfDoc.embedPng(qrPng);
    page.drawImage(qrImage, { x, y: y - 90, width: 90, height: 90 });

    // Serial text below QR
    const shortSerial = codes[i].serial.slice(0, 16);
    page.drawText(shortSerial, {
      x,
      y: y - 104,
      size: 6,
      font,
    });

    currentCol++;
    if (currentCol >= cols) {
      currentCol = 0;
      currentRow++;
    }
  }

  return pdfDoc.save();
}
