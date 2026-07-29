/**
 * Standalone AARYX operations worker for true 24/7 monitoring.
 * Run: npx tsx scripts/aaryx-worker.ts
 *
 * Requires env vars from .env.local (load manually or via dotenv in production).
 * On Vercel alone, cron ticks every minute — this script provides continuous polling.
 */
import { runOperationsTick } from "../lib/market-intelligence/operations/operations-orchestrator";

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
