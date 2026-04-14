import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /api/cron/keepalive
 *
 * Prevents Supabase free-tier from pausing due to inactivity.
 * Does a lightweight read + write to _keepalive table every call.
 * Auto-cleans old rows (keeps last 10).
 *
 * Trigger via:
 *   - Vercel Cron: vercel.json crons config, schedule every 6 hours
 *   - External cron: curl https://yourdomain.com/api/cron/keepalive
 *   - CLI: npx tsx lib/qr/keepalive.ts
 */
export async function GET(request: NextRequest) {
  // Optional: verify cron secret to prevent abuse
  const cronSecret = request.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    // Allow without secret in dev, enforce in production if CRON_SECRET is set
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createClient();
  const jitter = Math.random().toString(36).slice(2, 8);
  const now = new Date().toISOString();

  // Write
  const { error: writeErr } = await supabase
    .from("_keepalive")
    .insert({ ping: jitter, pinged_at: now });

  if (writeErr) {
    // Table might not exist — fall back to reading existing tables
    const { error: fallbackErr } = await supabase.from("qr_codes").select("id").limit(1);
    return NextResponse.json({
      ok: !fallbackErr,
      method: "read-only-fallback",
      ping: jitter,
      at: now,
      error: fallbackErr?.message,
    });
  }

  // Read back
  const { data } = await supabase
    .from("_keepalive")
    .select("*")
    .order("pinged_at", { ascending: false })
    .limit(1);

  // Clean (keep last 10)
  const { data: allRows } = await supabase
    .from("_keepalive")
    .select("id")
    .order("pinged_at", { ascending: false });

  let cleaned = 0;
  if (allRows && allRows.length > 10) {
    const toDelete = allRows.slice(10).map((r) => r.id);
    await supabase.from("_keepalive").delete().in("id", toDelete);
    cleaned = toDelete.length;
  }

  return NextResponse.json({
    ok: true,
    method: "write-read-clean",
    ping: jitter,
    at: now,
    read_back: data?.[0]?.ping,
    cleaned,
  });
}
