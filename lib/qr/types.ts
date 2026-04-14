// ============================================================
// Rule 11A Compliant QR Payload
// Ref: India Plastic Waste Management Rules 2016, Rule 11A (July 2025)
// Ref: GS1 Digital Link Standard (https://www.gs1.org/standards/gs1-digital-link)
// Ref: Goa DRS USI Specification (https://www.goadrs.com/)
// Ref: ISO/IEC 18004:2024 (QR Code specification)
// ============================================================

// --- Rule 11A mandatory fields ---
// The QR must encode:
//   1. PIBO name (Producer/Importer/Brand Owner)
//   2. CPCB registration number
//   3. Product SKU details
//   4. Plastic type and thickness
//   5. Batch/lot information

// --- GS1 Digital Link URI format ---
// https://id.gs1.org/01/{GTIN}/21/{serial}?10={batch}&17={expiry}
// This is the global standard — POS scanners AND smartphones can read it.
// BIN wraps this with additional DRS data via query params.

// --- Goa DRS USI requirements ---
// Each code is a Unique Serialized Identifier (USI):
//   - Cryptographically signed (tamper-proof)
//   - Collision-free (no duplicates ever)
//   - Status lifecycle: generated → active → scanned → redeemed → retired
//   - Deposit value embedded

/**
 * Rule 11A compliant product registration.
 * This is what the brand provides when onboarding a product SKU.
 */
export interface ProductRegistration {
  // Rule 11A mandatory
  pibo_name: string;               // Producer/Importer/Brand Owner legal name
  cpcb_registration: string;       // CPCB EPR portal registration number
  gtin: string;                    // GS1 Global Trade Item Number (8-14 digits)
  sku: string;                     // Product SKU code
  product_name: string;            // Human-readable product name
  plastic_type: PlasticCategory;   // PWM Rules category
  thickness_microns: number;       // Plastic thickness in microns (Rule 11A)
  net_weight_g: number;            // Net weight in grams
  material: MaterialType;          // Primary packaging material

  // Rule 11(2): Recycled content (only if packaging uses recycled plastic)
  recycled_content_pct?: number;   // Percentage of recycled plastic (0-100)
  resin_id_standard?: string;      // IS 14534:2023 resin identification mark

  // Rule 11(3)/(4): Compostable/biodegradable (only if applicable)
  is_compostable?: boolean;
  compostable_standard?: string;   // IS/ISO 17088:2021 or equivalent
  is_biodegradable?: boolean;
  biodegradable_timeframe?: string; // e.g. "180 days in industrial composting"

  // Optional / enrichment
  brand_name?: string;             // Consumer-facing brand name (if different from PIBO)
  category?: string;               // Product category (beverages, snacks, etc.)
  mrp_paisa?: number;              // MRP in paisa
  country_of_origin?: string;
}

/**
 * Plastic Waste Management Rules categories.
 * EPR fees differ by category (Cat I: Rs 4.5-6/kg, Cat II: Rs 6-8.5/kg, Cat III: Rs 8.5-10/kg)
 */
export type PlasticCategory =
  | "CAT_I"    // Rigid plastic (HDPE, PET, PP) — bottles, containers, caps
  | "CAT_II"   // Flexible plastic (LDPE, films) — pouches, sachets, wraps
  | "CAT_III"  // Multilayer/laminated (MLP) — chips packets, tetra packs
  | "CAT_IV";  // Compostable/biodegradable (PLA, starch-based)

export type MaterialType =
  | "PET"
  | "HDPE"
  | "LDPE"
  | "PP"
  | "PS"
  | "MLP"
  | "GLASS"
  | "ALUMINIUM"
  | "PAPER"
  | "OTHER";

/**
 * GS1 Digital Link compatible QR payload.
 *
 * The QR encodes a URL in GS1 Digital Link format:
 *   https://bin.eco/01/{GTIN}/21/{serial}?10={batch}&3103={weight}&7240={deposit}
 *
 * GS1 Application Identifiers used:
 *   01  = GTIN
 *   21  = Serial number
 *   10  = Batch/lot number
 *   17  = Expiry date (YYMMDD)
 *   3103 = Net weight in grams (3 decimal places)
 *   7240 = Custom: deposit value in paisa
 *
 * Additional BIN data passed as query params:
 *   _sig = HMAC-SHA256 signature (tamper detection)
 *   _v   = Schema version
 *   _pc  = Plastic category (CAT_I/II/III/IV)
 *   _mt  = Material type
 *   _th  = Thickness in microns
 *   _cr  = CPCB registration number
 */
export interface QRPayload {
  // GS1 core (encoded in URL path)
  gtin: string;          // AI 01: Global Trade Item Number
  serial: string;        // AI 21: Unique serial (BIN-{hex})
  batch: string;         // AI 10: Batch/lot number
  net_weight_g: number;  // AI 3103: Net weight in grams

  // DRS / Rule 11A (encoded as query params)
  deposit_paisa: number;       // AI 7240 (custom): Deposit value in paisa
  plastic_category: PlasticCategory;
  material: MaterialType;
  thickness_microns: number;
  cpcb_registration: string;

  // BIN protocol
  version: number;       // Schema version (currently 1)
  signature: string;     // HMAC-SHA256 for tamper detection
  generated_at: number;  // Unix timestamp (seconds)
}

/**
 * Database record for a QR code.
 * Maps to `qr_codes` table in Supabase.
 */
export interface QRRecord {
  id: string;
  serial: string;
  gs1_url: string;                 // Full GS1 Digital Link URL
  payload: QRPayload;
  status: QRStatus;
  deposit_paisa: number;
  brand_id: string;                // Maps to PIBO
  product_gtin: string;
  batch_id: string;
  plastic_category: PlasticCategory;
  material: MaterialType;
  thickness_microns: number;
  cpcb_registration: string;
  generated_at: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
  redeemed_at_location: RedemptionLocation | null;
  created_by: string;
}

export type QRStatus = "active" | "redeemed" | "expired" | "void";

export interface RedemptionLocation {
  lat: number;
  lng: number;
  collection_point_id?: string;
  collection_type?: "kirana" | "rvm" | "picker" | "hub";
}

// --- API Request/Response types ---

export interface GenerateRequest {
  brand_id: string;
  product_gtin: string;
  batch_id: string;
  count?: number;                  // default 1, max 1000
  // All other fields (material, thickness, deposit, CPCB reg) come from ProductRegistration
}

export interface GenerateResponse {
  qr_codes: Array<{
    serial: string;
    gs1_url: string;               // GS1 Digital Link URL (what gets printed / encoded in QR)
    qr_data_url: string;           // base64 PNG image of the QR code
    payload: QRPayload;
  }>;
  batch_id: string;
  count: number;
}

export interface ValidateResponse {
  valid: boolean;
  status: QRStatus;
  serial: string;
  deposit_paisa: number;
  product: {
    gtin: string;
    brand_id: string;
    material: MaterialType;
    plastic_category: PlasticCategory;
    net_weight_g: number;
  };
  generated_at: string;
  redeemed_at: string | null;
  tamper_check: "passed" | "failed";
}

// --- Printer integration types ---
// For streaming codes to production line printers (CIJ/TIJ/Laser)

export interface PrinterStreamItem {
  serial: string;
  gs1_url: string;                 // What the printer encodes in the QR
  human_readable: string;          // Text printed below QR (serial + batch for visual verification)
  sequence_number: number;         // Position in batch (for line synchronization)
}

export interface PrinterBatchManifest {
  batch_id: string;
  brand_id: string;
  product_gtin: string;
  total_count: number;
  generated_at: string;
  codes: PrinterStreamItem[];
}
