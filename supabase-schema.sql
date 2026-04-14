-- BIN QR Service Schema
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Product Registrations (Rule 11A compliant)
CREATE TABLE IF NOT EXISTS product_registrations (
  gtin VARCHAR(14) PRIMARY KEY,
  brand_id VARCHAR(100) NOT NULL,
  pibo_name VARCHAR(200) NOT NULL,
  cpcb_registration VARCHAR(50) NOT NULL,
  sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  plastic_type VARCHAR(20) NOT NULL,
  thickness_microns INTEGER NOT NULL,
  net_weight_g NUMERIC NOT NULL,
  material VARCHAR(20) NOT NULL,
  brand_name VARCHAR(200),
  category VARCHAR(100),
  mrp_paisa INTEGER,
  country_of_origin VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. QR Codes (serialized, GS1 Digital Link, Goa DRS USI compatible)
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial VARCHAR(64) UNIQUE NOT NULL,
  gs1_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  deposit_paisa INTEGER DEFAULT 0,
  brand_id VARCHAR(100) NOT NULL,
  product_gtin VARCHAR(14) NOT NULL,
  batch_id VARCHAR(50) NOT NULL,
  plastic_category VARCHAR(20),
  material VARCHAR(20),
  thickness_microns INTEGER,
  cpcb_registration VARCHAR(50),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ,
  redeemed_by VARCHAR(100),
  redeemed_at_location JSONB,
  created_by VARCHAR(100)
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_serial ON qr_codes(serial);
CREATE INDEX IF NOT EXISTS idx_qr_status ON qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_qr_brand ON qr_codes(brand_id);
CREATE INDEX IF NOT EXISTS idx_qr_batch ON qr_codes(batch_id);
CREATE INDEX IF NOT EXISTS idx_qr_gtin ON qr_codes(product_gtin);

-- 4. Disable RLS for now (service role key bypasses anyway)
ALTER TABLE product_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access" ON product_registrations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON qr_codes FOR ALL USING (true) WITH CHECK (true);

-- 5. Scan Events (append-only audit trail)
CREATE TABLE IF NOT EXISTS scan_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(30) NOT NULL,
  qr_serial VARCHAR(64) NOT NULL,
  product_gtin VARCHAR(14),
  batch_id VARCHAR(50),
  brand_id VARCHAR(100),
  actor_id VARCHAR(100) NOT NULL,
  actor_type VARCHAR(20) NOT NULL,
  location JSONB,
  ip_address INET,
  user_agent TEXT,
  outcome VARCHAR(20) NOT NULL,
  deposit_paisa INTEGER,
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  device_fingerprint VARCHAR(100),
  image_phash TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_serial ON scan_events(qr_serial);
CREATE INDEX IF NOT EXISTS idx_scan_time ON scan_events(created_at);
CREATE INDEX IF NOT EXISTS idx_scan_actor ON scan_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_scan_brand ON scan_events(brand_id);
CREATE INDEX IF NOT EXISTS idx_scan_type_time ON scan_events(event_type, created_at);

ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON scan_events FOR ALL USING (true) WITH CHECK (true);

-- Append-only enforcement: prevent UPDATE and DELETE on scan_events
CREATE OR REPLACE FUNCTION prevent_scan_modification() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'scan_events is append-only. Modifications not allowed.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_scans BEFORE UPDATE ON scan_events
  FOR EACH ROW EXECUTE FUNCTION prevent_scan_modification();
CREATE TRIGGER no_delete_scans BEFORE DELETE ON scan_events
  FOR EACH ROW EXECUTE FUNCTION prevent_scan_modification();

-- 6. Keepalive (prevents Supabase free-tier pause)
CREATE TABLE IF NOT EXISTS _keepalive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ping VARCHAR(10),
  pinged_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE _keepalive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON _keepalive FOR ALL USING (true) WITH CHECK (true);

-- 7. Enable Realtime for scan_events (live dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE scan_events;
