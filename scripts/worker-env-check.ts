#!/usr/bin/env npx tsx
/**
 * Validate env vars before deploying the external worker.
 * Usage: npm run mi:worker-env-check
 */
import { readFileSync, existsSync } from "node:fs";
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

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "MARKET_DATA_API_KEY",
  "NEWS_API_KEY",
  "OPENAI_API_KEY",
  "WORKER_SECRET",
] as const;

const RECOMMENDED = [
  "MI_PERSISTENCE_ENABLED",
  "MARKET_DATA_PROVIDER",
  "NEWS_DATA_PROVIDER",
  "AI_PROVIDER",
  "BACKGROUND_WORKERS_ENABLED",
  "MARKET_MONITORING_ENABLED",
  "NEWS_MONITORING_ENABLED",
  "AI_ANALYSIS_ENABLED",
] as const;

function has(key: string): boolean {
  const v = process.env[key];
  return Boolean(v && v.trim().length > 0);
}

console.log("=== Worker env check (copy these to Render/Railway) ===\n");

let missing = 0;
for (const key of REQUIRED) {
  const ok = has(key);
  if (!ok) missing += 1;
  console.log(`${ok ? "✓" : "✗"} ${key}`);
}

console.log("\nRecommended switches:");
for (const key of RECOMMENDED) {
  const val = process.env[key];
  console.log(`  ${key}=${val ?? "(not set)"}`);
}

if (missing > 0) {
  console.log(`\n${missing} required value(s) missing locally — fix before deploy.`);
  process.exit(1);
}

console.log("\nAll required worker env vars present locally.");
console.log("Copy the same keys/values into your external worker host (Render → Environment).");
