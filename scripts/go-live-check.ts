#!/usr/bin/env npx tsx
/**
 * Pre-flight checklist before running AARYX live.
 * Usage: npm run mi:live-check
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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

loadEnvLocal();

type Status = "OK" | "MISSING" | "OPTIONAL" | "ACTION";

interface Check {
  id: string;
  label: string;
  status: Status;
  detail: string;
}

function has(key: string): boolean {
  const v = process.env[key];
  return Boolean(v && v.trim().length > 0);
}

function check(): Check[] {
  const checks: Check[] = [];

  checks.push({
    id: "supabase-url",
    label: "Supabase URL + Anon Key",
    status: has("NEXT_PUBLIC_SUPABASE_URL") && has("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "OK" : "MISSING",
    detail: "Login + App",
  });

  checks.push({
    id: "service-role",
    label: "SUPABASE_SERVICE_ROLE_KEY",
    status: has("SUPABASE_SERVICE_ROLE_KEY") ? "OK" : "MISSING",
    detail: "Persistence + MI tables",
  });

  checks.push({
    id: "persistence",
    label: "MI_PERSISTENCE_ENABLED=true",
    status: process.env.MI_PERSISTENCE_ENABLED === "true" ? "OK" : "MISSING",
    detail: "Alerts/Jobs über Instanzen",
  });

  checks.push({
    id: "site-url",
    label: "NEXT_PUBLIC_SITE_URL",
    status: has("NEXT_PUBLIC_SITE_URL") ? "OK" : "MISSING",
    detail: process.env.NEXT_PUBLIC_SITE_URL ?? "Set to dev server port (e.g. http://localhost:3000)",
  });

  checks.push({
    id: "polygon-key",
    label: "MARKET_DATA_API_KEY",
    status: has("MARKET_DATA_API_KEY") ? "OK" : "MISSING",
    detail: "Polygon/Massive API key",
  });

  checks.push({
    id: "polygon-provider",
    label: "MARKET_DATA_PROVIDER=polygon",
    status: process.env.MARKET_DATA_PROVIDER === "polygon" ? "OK" : "MISSING",
    detail: process.env.MARKET_DATA_PROVIDER ?? "mock",
  });

  checks.push({
    id: "polygon-plan",
    label: "Polygon Futures Plan (Advanced ~$199)",
    status: "ACTION",
    detail: "Upgrade at massive.com/pricing — free tier causes 429 / no realtime",
  });

  checks.push({
    id: "news-key",
    label: "NEWS_API_KEY",
    status: has("NEWS_API_KEY") ? "OK" : "MISSING",
    detail: "https://newsapi.org/register — ohne Key nur Demo-News",
  });

  checks.push({
    id: "news-provider",
    label: "NEWS_DATA_PROVIDER=newsapi",
    status:
      has("NEWS_API_KEY") && process.env.NEWS_DATA_PROVIDER === "newsapi"
        ? "OK"
        : has("NEWS_API_KEY")
          ? "ACTION"
          : "MISSING",
    detail: "Set NEWS_DATA_PROVIDER=newsapi when key is present",
  });

  checks.push({
    id: "openai",
    label: "OPENAI_API_KEY",
    status: has("OPENAI_API_KEY") || has("AI_API_KEY") ? "OK" : "MISSING",
    detail: "https://platform.openai.com/api-keys — ohne Key nur Demo-KI",
  });

  checks.push({
    id: "worker-secret",
    label: "WORKER_SECRET / CRON_SECRET",
    status: has("WORKER_SECRET") || has("CRON_SECRET") ? "OK" : "MISSING",
    detail: "Worker + Vercel cron auth",
  });

  checks.push({
    id: "worker-switches",
    label: "Monitoring switches",
    status:
      process.env.MARKET_MONITORING_ENABLED !== "false" &&
      process.env.NEWS_MONITORING_ENABLED !== "false" &&
      process.env.BACKGROUND_WORKERS_ENABLED !== "false"
        ? "OK"
        : "ACTION",
    detail: "MARKET/NEWS/BACKGROUND_WORKERS_ENABLED should be true",
  });

  const telegramReady =
    process.env.TELEGRAM_ENABLED === "true" && has("TELEGRAM_BOT_TOKEN") && has("TELEGRAM_CHAT_ID");
  checks.push({
    id: "telegram",
    label: "Telegram Alerts",
    status: telegramReady ? "OK" : process.env.TELEGRAM_ENABLED === "true" ? "MISSING" : "OPTIONAL",
    detail: telegramReady ? "Configured" : "BotFather + Chat ID, or TELEGRAM_ENABLED=false",
  });

  checks.push({
    id: "worker-process",
    label: "Worker läuft (npm run mi:worker)",
    status: "ACTION",
    detail: "Separater Prozess — ohne ihn bleibt Monitoring OFFLINE",
  });

  checks.push({
    id: "vercel-cron",
    label: "Vercel Cron (später)",
    status: "OPTIONAL",
    detail: "vercel.json ist 1×/Tag — für 24/7 erst Worker hosten",
  });

  return checks;
}

function icon(status: Status): string {
  switch (status) {
    case "OK":
      return "✓";
    case "MISSING":
      return "✗";
    case "OPTIONAL":
      return "○";
    case "ACTION":
      return "→";
  }
}

async function main(): Promise<void> {
  console.log("=== AARYX Go-Live Check ===\n");

  const checks = check();
  const missing = checks.filter((c) => c.status === "MISSING");
  const actions = checks.filter((c) => c.status === "ACTION");

  for (const c of checks) {
    console.log(`  [${icon(c.status)}] ${c.label}`);
    console.log(`      ${c.detail}`);
  }

  console.log("\n--- Zum Live-Start (lokal) ---");
  console.log("  1. Fehlende Keys in .env.local einfügen");
  console.log("  2. Polygon Futures Advanced aktivieren");
  console.log("  3. npm run mi:verify");
  console.log("  4. npm run dev");
  console.log("  5. npm run mi:worker   (zweites Terminal)");
  console.log("  6. Terminal → Operations: alles ONLINE?");

  if (missing.length > 0) {
    console.log(`\n${missing.length} Pflichtpunkt(e) offen — noch nicht voll live.`);
    process.exit(1);
  }

  if (actions.length > 0) {
    console.log(`\n${actions.length} manuelle Schritt(e) — Keys ok, aber Plan/Worker noch nötig.`);
    process.exit(0);
  }

  console.log("\nAlle Checks grün — starte Dev + Worker.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
