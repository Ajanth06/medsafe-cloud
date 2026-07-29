/**
 * One-shot AARYX Supabase setup:
 * 1. Writes SUPABASE_DB_URL + SUPABASE_SERVICE_ROLE_KEY to .env.local
 * 2. Enables MI_PERSISTENCE_ENABLED
 * 3. Runs migrations 006–013
 * 4. Verifies tables + seeds assets
 *
 * Usage:
 *   MI_DB_PASSWORD='your-db-password' SUPABASE_SERVICE_ROLE_KEY='eyJ...' npm run mi:setup
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "woisxvgsgvpfnntmrpat";
const MI_MIGRATIONS = [
  "006_market_intelligence.sql",
  "007_news_intelligence.sql",
  "008_operations_alerting.sql",
  "009_persistence_layer.sql",
  "010_production_hardening.sql",
  "011_terminal_ux.sql",
  "012_complete_schema.sql",
  "013_rls_complete.sql",
];

function loadEnvLocal(): Record<string, string> {
  const path = join(process.cwd(), ".env.local");
  const env: Record<string, string> = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function upsertEnvLocal(updates: Record<string, string>): void {
  const path = join(process.cwd(), ".env.local");
  const lines = existsSync(path) ? readFileSync(path, "utf8").split("\n") : [];
  const keys = new Set(Object.keys(updates));

  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return true;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return true;
    return !keys.has(trimmed.slice(0, eq).trim());
  });

  for (const [key, value] of Object.entries(updates)) {
    kept.push(`${key}=${value}`);
  }

  writeFileSync(path, `${kept.filter((l, i, a) => !(i === a.length - 1 && l === "")).join("\n")}\n`);
}

function buildDbUrl(password: string): string {
  const encoded = encodeURIComponent(password);
  return `postgresql://postgres.${PROJECT_REF}:${encoded}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
}

async function applyMigrations(dbUrl: string): Promise<void> {
  const pg = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  await client.query(`
    create table if not exists public.mi_schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  for (const file of MI_MIGRATIONS) {
    const version = file.replace(".sql", "");
    const { rows } = await client.query(
      "select 1 from public.mi_schema_migrations where version = $1",
      [version],
    );
    if (rows.length > 0) {
      console.log(`  skip ${version}`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`  apply ${version}…`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        "insert into public.mi_schema_migrations (version) values ($1)",
        [version],
      );
      await client.query("commit");
      console.log(`  ✓ ${version}`);
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  await client.end();
}

async function verify(serviceKey: string, supabaseUrl: string): Promise<void> {
  const supabase = createClient(supabaseUrl, serviceKey);
  const tables = ["mi_assets", "mi_validation_runs", "mi_delivered_alerts", "mi_ai_analyses"];
  for (const table of tables) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error) throw new Error(`${table}: ${error.message}`);
    console.log(`  ✓ ${table}`);
  }

  await supabase.from("mi_assets").upsert(
    [
      { id: "wti", symbol: "WTI", provider_symbol: "CL=F", name: "WTI Crude Oil", asset_class: "commodity", priority: "primary" },
      { id: "brent", symbol: "BRENT", provider_symbol: "BZ=F", name: "Brent Crude Oil", asset_class: "commodity", priority: "primary" },
    ],
    { onConflict: "id" },
  );
}

async function main(): Promise<void> {
  const env = loadEnvLocal();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? `https://${PROJECT_REF}.supabase.co`;
  const dbPassword = process.env.MI_DB_PASSWORD ?? process.env.SUPABASE_DB_PASSWORD;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!dbPassword || !serviceKey) {
    console.error("Missing credentials. Run:");
    console.error("  MI_DB_PASSWORD='...' SUPABASE_SERVICE_ROLE_KEY='eyJ...' npm run mi:setup");
    console.error("\nGet them from Supabase Dashboard → Project Settings:");
    console.error("  - Database → Database password");
    console.error("  - API → service_role key (secret)");
    process.exit(1);
  }

  const dbUrl = buildDbUrl(dbPassword);
  upsertEnvLocal({
    SUPABASE_DB_URL: dbUrl,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    MI_PERSISTENCE_ENABLED: "true",
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  });

  console.log("Updated .env.local");
  console.log("Applying migrations…");
  await applyMigrations(dbUrl);
  console.log("Verifying…");
  await verify(serviceKey, supabaseUrl);
  console.log("\n✅ AARYX Supabase setup complete.");
}

main().catch((error) => {
  console.error("Setup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
