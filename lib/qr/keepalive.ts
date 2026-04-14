/**
 * Supabase Keepalive Cron
 *
 * Supabase pauses free-tier projects after 7 days of inactivity.
 * This script runs a lightweight read+write every few hours to keep it alive.
 *
 * Non-polluting: writes to a dedicated `_keepalive` table, auto-cleans old rows.
 *
 * Run manually:   npx tsx lib/qr/keepalive.ts
 * Run as cron:    Schedule via system cron, GitHub Actions, or Vercel Cron
 *
 * Crontab (every 6 hours with random jitter):
 *   0 0,6,12,18 * * * sleep $((RANDOM % 1800)) && cd /path/to/project && npx tsx lib/qr/keepalive.ts
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function keepalive() {
  const now = new Date().toISOString();
  const jitter = Math.random().toString(36).slice(2, 8);

  console.log(`[keepalive] ${now} — ping ${jitter}`);

  // 1. Ensure _keepalive table exists (idempotent)
  // We use a simple RPC approach — if the table doesn't exist, create it via insert fallback
  const { error: readErr } = await supabase
    .from("_keepalive")
    .select("id")
    .limit(1);

  if (readErr?.code === "42P01") {
    // Table doesn't exist — create it
    // This won't work via REST API, so we'll use a known table instead
    console.log("[keepalive] _keepalive table missing, using product_registrations for ping");

    // Just read from an existing table
    const { data, error } = await supabase
      .from("product_registrations")
      .select("gtin")
      .limit(1);
    console.log(`[keepalive] read product_registrations: ${error ? error.message : `${data?.length || 0} rows`}`);

    const { error: qrErr } = await supabase
      .from("qr_codes")
      .select("id")
      .limit(1);
    console.log(`[keepalive] read qr_codes: ${qrErr ? qrErr.message : "ok"}`);

    return;
  }

  // 2. Write a ping row
  const { error: writeErr } = await supabase
    .from("_keepalive")
    .insert({ ping: jitter, pinged_at: now });

  if (writeErr) {
    // Fallback: just read from existing tables
    console.log(`[keepalive] write failed (${writeErr.message}), falling back to read-only ping`);

    const { data, error } = await supabase
      .from("product_registrations")
      .select("gtin")
      .limit(1);
    console.log(`[keepalive] read product_registrations: ${error ? error.message : `${data?.length || 0} rows`}`);

    const { error: qrErr } = await supabase
      .from("qr_codes")
      .select("id")
      .limit(1);
    console.log(`[keepalive] read qr_codes: ${qrErr ? qrErr.message : "ok"}`);
    return;
  }

  console.log(`[keepalive] write ok: ${jitter}`);

  // 3. Read it back (proves read works)
  const { data, error: readBackErr } = await supabase
    .from("_keepalive")
    .select("*")
    .order("pinged_at", { ascending: false })
    .limit(1);

  console.log(`[keepalive] read back: ${readBackErr ? readBackErr.message : data?.[0]?.ping}`);

  // 4. Clean old rows (keep last 10 only — non-polluting)
  const { data: allRows } = await supabase
    .from("_keepalive")
    .select("id")
    .order("pinged_at", { ascending: false });

  if (allRows && allRows.length > 10) {
    const toDelete = allRows.slice(10).map((r) => r.id);
    await supabase.from("_keepalive").delete().in("id", toDelete);
    console.log(`[keepalive] cleaned ${toDelete.length} old rows`);
  }

  console.log("[keepalive] done");
}

keepalive().catch((err) => {
  console.error("[keepalive] fatal:", err);
  process.exit(1);
});
