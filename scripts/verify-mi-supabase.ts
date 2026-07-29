/**
 * Apply MI schema via Supabase SQL using the database REST SQL endpoint.
 * Fallback when SUPABASE_DB_URL is not set — uses service role + pg meta if available.
 *
 * Primary path: npm run mi:migrate (requires SUPABASE_DB_URL)
 * This script: verifies tables exist and seeds assets via service role.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createServiceClient } from "../lib/supabase/admin";

function loadEnvLocal(): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const ASSETS = [
  { id: "wti", symbol: "WTI", provider_symbol: "CL=F", name: "WTI Crude Oil", asset_class: "commodity", priority: "primary" },
  { id: "brent", symbol: "BRENT", provider_symbol: "BZ=F", name: "Brent Crude Oil", asset_class: "commodity", priority: "primary" },
  { id: "gold", symbol: "GOLD", provider_symbol: "GC=F", name: "Gold", asset_class: "commodity", priority: "standard" },
  { id: "dax", symbol: "DAX", provider_symbol: "^GDAXI", name: "DAX", asset_class: "index", priority: "standard" },
  { id: "ndx", symbol: "NDX", provider_symbol: "^NDX", name: "NASDAQ 100", asset_class: "index", priority: "standard" },
  { id: "spx", symbol: "SPX", provider_symbol: "^GSPC", name: "S&P 500", asset_class: "index", priority: "standard" },
  { id: "eurusd", symbol: "EURUSD", provider_symbol: "EURUSD=X", name: "EUR/USD", asset_class: "forex", priority: "standard" },
  { id: "btc", symbol: "BTC", provider_symbol: "BTC-USD", name: "Bitcoin", asset_class: "crypto", priority: "standard" },
];

async function checkTable(supabase: NonNullable<ReturnType<typeof createServiceClient>>, table: string): Promise<boolean> {
  const { error } = await supabase.from(table).select("*").limit(1);
  return !error;
}

async function main(): Promise<void> {
  loadEnvLocal();
  const supabase = createServiceClient();
  if (!supabase) {
    console.error("SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL required.");
    process.exit(1);
  }

  const tables = [
    "mi_assets",
    "mi_market_events",
    "mi_intelligence_event_clusters",
    "mi_background_jobs",
    "mi_delivered_alerts",
    "mi_latest_quotes",
    "mi_ai_analyses",
    "mi_validation_runs",
  ];

  console.log("Checking MI tables…");
  const missing: string[] = [];
  for (const table of tables) {
    const ok = await checkTable(supabase, table);
    console.log(`  ${ok ? "✓" : "✗"} ${table}`);
    if (!ok) missing.push(table);
  }

  if (missing.length > 0) {
    console.error("\nMissing tables:", missing.join(", "));
    console.error("Run: npm run mi:migrate");
    console.error("Or paste supabase/migrations/006–013 into Supabase SQL Editor.");
    process.exit(1);
  }

  const { error } = await (supabase as import("@supabase/supabase-js").SupabaseClient)
    .from("mi_assets")
    .upsert(ASSETS, { onConflict: "id" });
  if (error) {
    console.warn("Asset seed warning:", error.message);
  } else {
    console.log("✓ Assets seeded");
  }

  console.log("\nSupabase MI schema verified. Set MI_PERSISTENCE_ENABLED=true");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
