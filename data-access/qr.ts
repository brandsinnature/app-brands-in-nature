"use server";

import { createClient } from "@/utils/supabase/server";
import type { QRPayload, QRRecord, ProductRegistration, PlasticCategory, MaterialType, RedemptionLocation } from "@/lib/qr/types";

export async function upsertProductRegistration(product: ProductRegistration & { brand_id: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product_registrations")
    .upsert(
      {
        brand_id: product.brand_id,
        gtin: product.gtin,
        pibo_name: product.pibo_name,
        cpcb_registration: product.cpcb_registration,
        sku: product.sku,
        product_name: product.product_name,
        plastic_type: product.plastic_type,
        thickness_microns: product.thickness_microns,
        net_weight_g: product.net_weight_g,
        material: product.material,
        brand_name: product.brand_name,
        category: product.category,
        mrp_paisa: product.mrp_paisa,
        country_of_origin: product.country_of_origin,
      },
      { onConflict: "gtin" }
    )
    .select("gtin")
    .single();

  if (error) return { error: error.message };
  return { data };
}

export async function getProductRegistration(gtin: string): Promise<(ProductRegistration & { brand_id: string }) | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("product_registrations")
    .select("*")
    .eq("gtin", gtin)
    .single();

  if (error || !data) return null;
  return data as ProductRegistration & { brand_id: string };
}

export async function insertQRCodes(
  codes: Array<{
    serial: string;
    gs1_url: string;
    payload: QRPayload;
    deposit_paisa: number;
    brand_id: string;
    product_gtin: string;
    batch_id: string;
    plastic_category: PlasticCategory;
    material: MaterialType;
    thickness_microns: number;
    cpcb_registration: string;
    created_by: string;
  }>
) {
  const supabase = createClient();
  const rows = codes.map((c) => ({
    serial: c.serial,
    gs1_url: c.gs1_url,
    payload: c.payload,
    status: "active",
    deposit_paisa: c.deposit_paisa,
    brand_id: c.brand_id,
    product_gtin: c.product_gtin,
    batch_id: c.batch_id,
    plastic_category: c.plastic_category,
    material: c.material,
    thickness_microns: c.thickness_microns,
    cpcb_registration: c.cpcb_registration,
    created_by: c.created_by,
  }));

  // Insert with retry on unique constraint violation (serial collision).
  // Collision is near-impossible (timestamp + 10 random chars = 3.66×10^15 per ms)
  // but we handle it anyway because this is a financial system (deposits are real money).
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data, error } = await supabase
      .from("qr_codes")
      .insert(rows)
      .select("id, serial");

    if (!error) return { data };

    // Check if it's a unique constraint violation (Postgres error 23505)
    if (error.code === "23505" && attempt < MAX_RETRIES - 1) {
      console.warn(`[qr] Serial collision on attempt ${attempt + 1}, regenerating...`);
      // Regenerate serials for the colliding rows and retry
      // In practice this never happens — but if it does, we handle it.
      const { generateSerial } = await import("@/lib/qr/serial");
      rows.forEach((row) => { row.serial = generateSerial(); });
      continue;
    }

    return { error: error.message };
  }

  return { error: "Insert failed after max retries" };
}

export async function getQRBySerial(serial: string): Promise<QRRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("serial", serial)
    .single();

  if (error || !data) return null;
  return data as QRRecord;
}

export async function redeemQRCode(params: {
  serial: string;
  redeemed_by: string;
  location?: RedemptionLocation;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("qr_codes")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
      redeemed_by: params.redeemed_by,
      redeemed_at_location: params.location || null,
    })
    .eq("serial", params.serial)
    .eq("status", "active")
    .select("id, serial, deposit_paisa")
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "QR code not found or already redeemed" };
  return { data };
}

export async function getQRStats(brand_id?: string) {
  const supabase = createClient();
  let query = supabase.from("qr_codes").select("status");
  if (brand_id) query = query.eq("brand_id", brand_id);

  const { data, error } = await query;
  if (error) return { error: error.message };

  const stats = { total: 0, active: 0, redeemed: 0, expired: 0, void: 0 };
  data?.forEach((row: { status: string }) => {
    stats.total++;
    if (row.status in stats) stats[row.status as keyof typeof stats]++;
  });

  return { data: stats };
}
