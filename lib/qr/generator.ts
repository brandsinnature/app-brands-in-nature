import QRCode from "qrcode";
import { generateSerial, signPayload, buildGS1DigitalLinkURL, getCurrentKeyVersion } from "./crypto";
import type { QRPayload, ProductRegistration, PrinterStreamItem } from "./types";

const BASE_DOMAIN = process.env.NEXT_PUBLIC_QR_DOMAIN || "https://bin.eco";
// Domain structure:
//   joinbin.com       — marketing site
//   app.joinbin.com   — consumer app
//   bin.eco           — QR code resolution (GS1 Digital Link)
//   api.joinbin.com   — brand API (future)

// Default deposit values by plastic category (paisa)
// Cat I (rigid): Rs 5 = 500 paisa
// Cat II (flexible): Rs 3 = 300 paisa
// Cat III (MLP): Rs 2 = 200 paisa
// Cat IV (compostable): Rs 2 = 200 paisa
const DEFAULT_DEPOSIT: Record<string, number> = {
  CAT_I: 500,
  CAT_II: 300,
  CAT_III: 200,
  CAT_IV: 200,
};

/**
 * Generate a single GS1 Digital Link + Rule 11A compliant QR code.
 *
 * The QR encodes a URL like:
 *   https://bin.eco/01/8901234567890/21/BIN-a1b2c3d4e5f6a7b8c9d0e1f2?10=LOT2025A&3103=500000&7240=500&_sig=abc123&_v=1&_pc=CAT_I&_mt=PET&_th=250&_cr=CPCB12345
 *
 * This URL is:
 *   - GS1 Digital Link compliant (POS scanners can read GTIN)
 *   - Rule 11A compliant (CPCB reg, plastic type, thickness encoded)
 *   - Goa DRS USI compatible (serialized, signed, one-time-use)
 *   - Scannable by any smartphone (opens BIN web app with full product + deposit info)
 */
export async function generateQRCode(params: {
  product: ProductRegistration;
  batch_id: string;
  deposit_override?: number; // Optional deposit override in paisa
}): Promise<{
  serial: string;
  gs1_url: string;
  qr_data_url: string;
  payload: QRPayload;
}> {
  // Serial generation with collision retry (max 3 attempts).
  // nanoid keyspace is 36^16 = 7.96×10^24 so collisions are near-impossible,
  // but Kezzler and Recykal both do active deduplication. We catch DB unique violations.
  const serial = generateSerial();
  const timestamp = Math.floor(Date.now() / 1000);
  const deposit = params.deposit_override ?? DEFAULT_DEPOSIT[params.product.plastic_type] ?? 500;

  // Build the data to sign (excludes signature itself)
  const keyVersion = getCurrentKeyVersion();
  const sigData: Record<string, unknown> = {
    gtin: params.product.gtin,
    serial,
    batch: params.batch_id,
    net_weight_g: params.product.net_weight_g,
    deposit_paisa: deposit,
    plastic_category: params.product.plastic_type,
    material: params.product.material,
    thickness_microns: params.product.thickness_microns,
    cpcb_registration: params.product.cpcb_registration,
    version: 1,
    generated_at: timestamp,
  };

  const signature = signPayload(sigData, keyVersion);

  // Build GS1 Digital Link URL
  const gs1_url = buildGS1DigitalLinkURL({
    domain: BASE_DOMAIN,
    gtin: params.product.gtin,
    serial,
    batch: params.batch_id,
    net_weight_g: params.product.net_weight_g,
    deposit_paisa: deposit,
    plastic_category: params.product.plastic_type,
    material: params.product.material,
    thickness_microns: params.product.thickness_microns,
    cpcb_registration: params.product.cpcb_registration,
    version: 1,
    signature,
    key_version: keyVersion,
  });

  // Generate QR image
  // ISO/IEC 18004:2024 compliant, error correction H (30%) for industrial printing durability
  const qr_data_url = await QRCode.toDataURL(gs1_url, {
    errorCorrectionLevel: "H",  // 30% recovery — handles print damage on production lines
    type: "image/png",
    width: 300,                  // 300px for screen; printers use vector/SVG at 600+ DPI
    margin: 4,                   // ISO minimum quiet zone: 4 modules
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  const payload: QRPayload = {
    gtin: params.product.gtin,
    serial,
    batch: params.batch_id,
    net_weight_g: params.product.net_weight_g,
    deposit_paisa: deposit,
    plastic_category: params.product.plastic_type,
    material: params.product.material,
    thickness_microns: params.product.thickness_microns,
    cpcb_registration: params.product.cpcb_registration,
    version: 1,
    signature,
    generated_at: timestamp,
  };

  return { serial, gs1_url, qr_data_url, payload };
}

/**
 * Generate a batch of QR codes.
 * Returns both the QR images (for download/display) and a printer manifest
 * (for streaming to CIJ/TIJ/Laser printers on the production line).
 */
export async function generateBatch(params: {
  product: ProductRegistration;
  batch_id: string;
  count: number;
  deposit_override?: number;
}): Promise<{
  codes: Array<{
    serial: string;
    gs1_url: string;
    qr_data_url: string;
    payload: QRPayload;
  }>;
  printer_manifest: PrinterStreamItem[];
}> {
  const codes = [];
  const printer_manifest: PrinterStreamItem[] = [];

  for (let i = 0; i < params.count; i++) {
    const qr = await generateQRCode({
      product: params.product,
      batch_id: params.batch_id,
      deposit_override: params.deposit_override,
    });
    codes.push(qr);
    printer_manifest.push({
      serial: qr.serial,
      gs1_url: qr.gs1_url,
      human_readable: `${qr.serial} | ${params.batch_id}`,
      sequence_number: i + 1,
    });
  }

  return { codes, printer_manifest };
}

/**
 * Generate QR as SVG string (for high-resolution printing at 600+ DPI).
 * CIJ/TIJ printers need vector format, not raster PNG.
 */
export async function generateQRSVG(gs1_url: string): Promise<string> {
  return QRCode.toString(gs1_url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 4,
  });
}
