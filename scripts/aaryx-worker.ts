/**
 * Standalone AARYX operations worker for true 24/7 monitoring.
 * Run: npm run mi:worker
 *
 * Loads .env.local automatically (same as other mi:* scripts).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runOperationsTick } from "../lib/market-intelligence/operations/operations-orchestrator";

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

const TICK_MS = Number(process.env.WORKER_TICK_INTERVAL_MS ?? 5_000);

async function main() {
  console.info(`[aaryx-worker] Starting with tick interval ${TICK_MS}ms`);

  while (true) {
    try {
      const result = await runOperationsTick();
      console.info(
        `[aaryx-worker] tick ok alerts=${result.alertsDelivered} jobs=${result.jobsProcessed} issues=${result.watchdogIssues.length}`,
      );
    } catch (error) {
      console.error("[aaryx-worker] tick failed", error);
    }
    await new Promise((resolve) => setTimeout(resolve, TICK_MS));
  }
}

main();
