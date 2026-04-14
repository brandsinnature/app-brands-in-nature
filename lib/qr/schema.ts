import { z } from "zod";

// --- Product Registration (Rule 11A compliant) ---
export const ProductRegistrationSchema = z.object({
  pibo_name: z.string().min(1).max(200),
  cpcb_registration: z.string().min(1).max(50),
  gtin: z.string().regex(/^\d{8,14}$/, "GTIN must be 8-14 digits"),
  sku: z.string().min(1).max(50),
  product_name: z.string().min(1).max(200),
  plastic_type: z.enum(["CAT_I", "CAT_II", "CAT_III", "CAT_IV"]),
  thickness_microns: z.number().int().min(1).max(10000),
  net_weight_g: z.number().min(0.1).max(100000),
  material: z.enum(["PET", "HDPE", "LDPE", "PP", "PS", "MLP", "GLASS", "ALUMINIUM", "PAPER", "OTHER"]),
  // Rule 11(2): Recycled content (conditional)
  recycled_content_pct: z.number().min(0).max(100).optional(),
  resin_id_standard: z.string().max(50).optional(),
  // Rule 11(3)/(4): Compostable/biodegradable (conditional)
  is_compostable: z.boolean().optional(),
  compostable_standard: z.string().max(100).optional(),
  is_biodegradable: z.boolean().optional(),
  biodegradable_timeframe: z.string().max(100).optional(),
  // Optional enrichment
  brand_name: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  mrp_paisa: z.number().int().min(0).optional(),
  country_of_origin: z.string().max(50).optional(),
});

// --- QR Generation Request ---
// brand_id + product_gtin identify the registered product.
// All Rule 11A fields come from the product registration, not per-QR request.
export const GenerateSchema = z.object({
  brand_id: z.string().min(1).max(100),
  product_gtin: z.string().regex(/^\d{8,14}$/, "GTIN must be 8-14 digits"),
  batch_id: z.string().min(1).max(50),
  count: z.number().int().min(1).max(1000).default(1),
  // Optional overrides (normally from product registration)
  deposit_paisa: z.number().int().min(0).max(10000).optional(), // Override deposit for this batch
});

// --- QR Validation ---
export const ValidateSchema = z.object({
  serial: z.string().min(1).max(64),
});

// --- QR Redemption ---
export const RedeemSchema = z.object({
  serial: z.string().min(1).max(64),
  redeemed_by: z.string().min(1).max(100),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      collection_point_id: z.string().optional(),
      collection_type: z.enum(["kirana", "rvm", "picker", "hub"]).optional(),
    })
    .optional(),
});

// --- Status Query ---
export const StatusSchema = z.object({
  serial: z.string().min(1).max(64).optional(),
  brand_id: z.string().min(1).max(100).optional(),
});
