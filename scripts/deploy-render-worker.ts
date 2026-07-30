#!/usr/bin/env npx tsx
/**
 * Create / update the AARYX Render background worker and sync env vars.
 * Prerequisites:
 *   - `render login` done
 *   - Payment method on Render (Workers need Starter+)
 *   - Local .env.local with keys
 *
 * Usage: npm run mi:deploy-worker
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function loadEnvLocal(): Record<string, string> {
  const path = join(process.cwd(), ".env.local");
  const out: Record<string, string> = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    out[key] = value;
    if (!process.env[key]) process.env[key] = value;
  }
  return out;
}

function run(args: string[], opts?: { allowFail?: boolean }): string {
  const result = spawnSync("render", args, {
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0 && !opts?.allowFail) {
    console.error(result.stdout || "");
    console.error(result.stderr || "");
    throw new Error(`render ${args.join(" ")} failed (${result.status})`);
  }
  return (result.stdout || "") + (result.stderr || "");
}

function has(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEWS_API_KEY",
  "OPENAI_API_KEY",
  "WORKER_SECRET",
] as const;

function main(): void {
  loadEnvLocal();

  const missing = REQUIRED.filter((k) => !has(k));
  if (missing.length) {
    console.error("Missing env in .env.local:", missing.join(", "));
    process.exit(1);
  }

  console.log("=== AARYX Render worker deploy ===\n");

  // Ensure workspace is set (best effort)
  run(["whoami", "-o", "text"], { allowFail: true });

  const listOut = run(["services", "-o", "json"], { allowFail: true });
  let existingId: string | null = null;
  try {
    const services = JSON.parse(listOut) as { id?: string; name?: string; service?: { id?: string; name?: string } }[];
    for (const s of services) {
      const name = s.name ?? s.service?.name;
      const id = s.id ?? s.service?.id;
      if (name === "aaryx-worker" && id) existingId = id;
    }
  } catch {
    // ignore parse errors from empty list
  }

  const envFlags: string[] = [];
  const envPairs: Record<string, string> = {
    NODE_ENV: "production",
    MI_PERSISTENCE_ENABLED: "true",
    MARKET_DATA_PROVIDER: process.env.MARKET_DATA_PROVIDER ?? "polygon",
    NEWS_DATA_PROVIDER: process.env.NEWS_DATA_PROVIDER ?? "newsapi",
    AI_PROVIDER: process.env.AI_PROVIDER ?? "openai",
    AI_MODEL: process.env.AI_MODEL ?? "gpt-4o-mini",
    ALERT_DELIVERY_ENABLED: "true",
    BACKGROUND_WORKERS_ENABLED: "true",
    MARKET_MONITORING_ENABLED: "true",
    NEWS_MONITORING_ENABLED: "true",
    AI_ANALYSIS_ENABLED: "true",
    MARKET_POLL_INTERVAL_MS: process.env.MARKET_POLL_INTERVAL_MS ?? "15000",
    NEWS_POLL_INTERVAL_MS: process.env.NEWS_POLL_INTERVAL_MS ?? "30000",
    WORKER_TICK_INTERVAL_MS: process.env.WORKER_TICK_INTERVAL_MS ?? "15000",
    WORKER_HEARTBEAT_STALE_MS: process.env.WORKER_HEARTBEAT_STALE_MS ?? "120000",
    ALERT_COOLDOWN_MS: process.env.ALERT_COOLDOWN_MS ?? "300000",
    WORKER_INSTANCE_ID: "aaryx-worker-render",
    TELEGRAM_ENABLED: process.env.TELEGRAM_ENABLED ?? "false",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL!,
    NEWS_API_KEY: process.env.NEWS_API_KEY!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    WORKER_SECRET: process.env.WORKER_SECRET!,
    CRON_SECRET: process.env.CRON_SECRET || process.env.WORKER_SECRET!,
  };

  if (process.env.OILPRICEAPI_KEY) envPairs.OILPRICEAPI_KEY = process.env.OILPRICEAPI_KEY;
  if (process.env.OIL_PRICE_API_KEY && !envPairs.OILPRICEAPI_KEY) {
    envPairs.OILPRICEAPI_KEY = process.env.OIL_PRICE_API_KEY;
  }
  if (process.env.MARKET_DATA_API_KEY) envPairs.MARKET_DATA_API_KEY = process.env.MARKET_DATA_API_KEY;
  if (process.env.TELEGRAM_BOT_TOKEN) envPairs.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (process.env.TELEGRAM_CHAT_ID) envPairs.TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (process.env.TELEGRAM_MIN_SEVERITY) envPairs.TELEGRAM_MIN_SEVERITY = process.env.TELEGRAM_MIN_SEVERITY;

  for (const [k, v] of Object.entries(envPairs)) {
    envFlags.push("--env-var", `${k}=${v}`);
  }

  if (existingId) {
    console.log(`Updating existing service ${existingId}…`);
    run([
      "services",
      "update",
      existingId,
      "--confirm",
      "-o",
      "json",
      ...envFlags,
    ]);
    console.log("Env updated. Triggering deploy…");
    run(["deploys", "create", existingId, "--confirm", "-o", "text"], { allowFail: true });
  } else {
    console.log("Creating background worker aaryx-worker…");
    const createOut = run([
      "services",
      "create",
      "--confirm",
      "-o",
      "json",
      "--name",
      "aaryx-worker",
      "--type",
      "background_worker",
      "--runtime",
      "docker",
      "--repo",
      "https://github.com/Ajanth06/medsafe-cloud",
      "--branch",
      "main",
      "--plan",
      "starter",
      "--region",
      "frankfurt",
      "--auto-deploy",
      ...envFlags,
    ]);
    console.log(createOut);
  }

  console.log("\nDone. Check Render dashboard → aaryx-worker → Logs for tick output.");
  console.log("Dashboard: https://dashboard.render.com/");
}

main();
