/**
 * Apply AARYX Market Intelligence migrations (006–013) to Supabase Postgres.
 *
 * Requires DATABASE_URL or SUPABASE_DB_URL in environment, e.g.:
 * postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
 *
 * Usage: npm run mi:migrate
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

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

async function applyMigration(client: import("pg").Client, version: string, sql: string): Promise<void> {
  const { rows } = await client.query(
    "select 1 from public.mi_schema_migrations where version = $1",
    [version],
  );
  if (rows.length > 0) {
    console.log(`  skip ${version} (already applied)`);
    return;
  }

  console.log(`  apply ${version}…`);
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query(
      "insert into public.mi_schema_migrations (version) values ($1) on conflict do nothing",
      [version],
    );
    await client.query("commit");
    console.log(`  ✓ ${version}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function main(): Promise<void> {
  loadEnvLocal();

  const dbUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("Missing SUPABASE_DB_URL or DATABASE_URL.");
    console.error("Get it from Supabase → Project Settings → Database → Connection string (URI)");
    process.exit(1);
  }

  let pg: typeof import("pg");
  try {
    pg = await import("pg");
  } catch {
    console.error("Install pg: npm install --save-dev pg");
    process.exit(1);
  }

  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

  console.log("Connecting to Supabase Postgres…");
  await client.connect();

  // Bootstrap migration tracking table
  await client.query(`
    create table if not exists public.mi_schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  console.log("Applying MI migrations…");
  for (const file of MI_MIGRATIONS) {
    const path = join(migrationsDir, file);
    if (!existsSync(path)) {
      console.warn(`  warn: missing ${file}`);
      continue;
    }
    const sql = readFileSync(path, "utf8");
    const version = file.replace(".sql", "");
    await applyMigration(client, version, sql);
  }

  await client.end();
  console.log("\nDone. Enable persistence:");
  console.log("  MI_PERSISTENCE_ENABLED=true");
  console.log("  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>");
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
