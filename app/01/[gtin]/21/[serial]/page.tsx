import { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

/**
 * GS1 Digital Link Resolver
 *
 * When a consumer scans a BIN QR code, their phone opens:
 *   https://bin.eco/01/{GTIN}/21/{serial}?10={batch}&...
 *
 * This page resolves that URL to a product info / redemption page.
 * Fulfills GS1-Conformant Resolver Standard 1.0 requirement:
 *   "The domain in the GS1 Digital Link URI MUST resolve to an HTTP server."
 *
 * For browsers: renders product + deposit info + "Claim deposit" CTA
 * For API clients (Accept: application/json): returns JSON (handled by route.ts)
 */

interface Props {
  params: Promise<{ gtin: string; serial: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { gtin, serial } = await params;
  return {
    title: `BIN | Product ${gtin}`,
    description: `Scan result for serial ${serial}`,
  };
}

export default async function GS1ResolverPage({ params, searchParams }: Props) {
  const { gtin, serial } = await params;
  const query = await searchParams;

  const supabase = createClient();

  // Look up the QR code
  const { data: qrRecord } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("serial", serial)
    .single();

  // Look up the product
  const { data: product } = await supabase
    .from("product_registrations")
    .select("*")
    .eq("gtin", gtin)
    .single();

  const depositRs = ((qrRecord?.deposit_paisa || 0) / 100).toFixed(0);
  const status = qrRecord?.status || "unknown";
  const isActive = status === "active";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-voska tracking-wide">BIN</h1>
          <p className="text-sm text-muted-foreground mt-1">Brands In Nature</p>
        </div>

        {/* Product Card */}
        <div className="border rounded-xl p-6 space-y-4 bg-card">
          {product ? (
            <>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Product</p>
                <p className="text-lg font-semibold">{product.product_name}</p>
                <p className="text-sm text-muted-foreground">{product.brand_name || product.pibo_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">GTIN</p>
                  <p className="font-mono">{gtin}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Material</p>
                  <p>{product.material} ({product.plastic_type})</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Weight</p>
                  <p>{product.net_weight_g}g</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Thickness</p>
                  <p>{product.thickness_microns}μm</p>
                </div>
              </div>
            </>
          ) : (
            <div>
              <p className="text-lg font-semibold">Product: {gtin}</p>
              <p className="text-sm text-muted-foreground">Not registered</p>
            </div>
          )}
        </div>

        {/* Deposit Card */}
        <div className={`border rounded-xl p-6 text-center ${isActive ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800" : "bg-muted"}`}>
          {isActive ? (
            <>
              <p className="text-sm text-muted-foreground">Deposit refund</p>
              <p className="text-4xl font-bold text-green-700 dark:text-green-400">₹{depositRs}</p>
              <p className="text-xs text-muted-foreground mt-2">Serial: {serial}</p>
              <p className="text-xs text-muted-foreground">Batch: {query["10"] || "—"}</p>
            </>
          ) : status === "redeemed" ? (
            <>
              <p className="text-sm text-muted-foreground">This code has been</p>
              <p className="text-2xl font-bold text-orange-600">Already Redeemed</p>
              <p className="text-xs text-muted-foreground mt-2">
                Redeemed by: {qrRecord?.redeemed_by || "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                At: {qrRecord?.redeemed_at ? new Date(qrRecord.redeemed_at).toLocaleString("en-IN") : "—"}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="text-2xl font-bold">{status}</p>
            </>
          )}
        </div>

        {/* CTA */}
        {isActive && (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Return this packaging at any BIN collection point to claim your ₹{depositRs} deposit.
            </p>
          </div>
        )}

        {/* Rule 11A Info */}
        {product && (
          <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
            <p>PIBO: {product.pibo_name}</p>
            <p>CPCB Reg: {product.cpcb_registration}</p>
            <p>SKU: {product.sku}</p>
          </div>
        )}
      </div>
    </div>
  );
}
