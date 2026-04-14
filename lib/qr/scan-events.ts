/**
 * SCAN AUDIT TRAIL
 *
 * Append-only event log. Every scan is recorded — not just redemptions.
 * EPCIS 2.0 compatible fields for future interoperability.
 *
 * Table: scan_events (append-only, no UPDATE/DELETE allowed)
 */

import { createClient } from "@/utils/supabase/server";

export interface ScanEventData {
  event_type: "scan" | "redeem" | "verify" | "reject" | "void";
  qr_serial: string;
  product_gtin?: string;
  batch_id?: string;
  brand_id?: string;
  actor_id: string;
  actor_type: "consumer" | "collector" | "rvm" | "auditor" | "system";
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
    collection_point_id?: string;
    collection_type?: "kirana" | "rvm" | "picker" | "hub";
  };
  ip_address?: string;
  user_agent?: string;
  outcome: "success" | "failure" | "duplicate" | "expired" | "tampered";
  deposit_paisa?: number;
  previous_status?: string;
  new_status?: string;
  device_fingerprint?: string;
  image_phash?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Record a scan event (append-only).
 * Call this for EVERY scan — validate, redeem, reject, everything.
 */
export async function recordScanEvent(event: ScanEventData) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("scan_events")
    .insert({
      event_type: event.event_type,
      qr_serial: event.qr_serial,
      product_gtin: event.product_gtin,
      batch_id: event.batch_id,
      brand_id: event.brand_id,
      actor_id: event.actor_id,
      actor_type: event.actor_type,
      location: event.location ? JSON.stringify(event.location) : null,
      ip_address: event.ip_address,
      user_agent: event.user_agent,
      outcome: event.outcome,
      deposit_paisa: event.deposit_paisa,
      previous_status: event.previous_status,
      new_status: event.new_status,
      device_fingerprint: event.device_fingerprint,
      image_phash: event.image_phash,
      metadata: event.metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[scan-event] insert failed:", error.message);
    return null;
  }

  return data?.id;
}

/**
 * Get recent scan events for a serial (for anomaly detection).
 */
export async function getRecentScansForSerial(serial: string, limit: number = 10) {
  const supabase = createClient();

  const { data } = await supabase
    .from("scan_events")
    .select("*")
    .eq("qr_serial", serial)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

/**
 * Get scan events for a brand (for analytics dashboard).
 */
export async function getScanEventsForBrand(
  brand_id: string,
  since?: string,
  limit: number = 1000
) {
  const supabase = createClient();

  let query = supabase
    .from("scan_events")
    .select("*")
    .eq("brand_id", brand_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (since) {
    query = query.gte("created_at", since);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { data };
}
