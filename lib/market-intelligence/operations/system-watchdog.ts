import { getOperationsConfig } from "@/lib/market-intelligence/config/operations-config";
import { getDeliveryStats } from "@/lib/market-intelligence/operations/alert-delivery-engine";
import { getWorkerHeartbeats } from "@/lib/market-intelligence/operations/heartbeat";
import { TelegramAlertChannel } from "@/lib/market-intelligence/operations/channels/telegram-channel";
import { getStreamState } from "@/lib/market-intelligence/services/market-stream-service";
import type { EngineStatus, OperationsHealth } from "@/lib/types/market";

let lastPipelineRunAt: string | null = null;
let jobsProcessed = 0;

export function recordPipelineRun(): void {
  lastPipelineRunAt = new Date().toISOString();
  jobsProcessed += 1;
}

function workerStatus(workerType: string): EngineStatus {
  const beat = getWorkerHeartbeats().find((b) => b.workerType === workerType);
  if (!beat) return "OFFLINE";
  if (beat.status === "ONLINE") return "ACTIVE";
  if (beat.status === "DEGRADED") return "DEGRADED";
  return "OFFLINE";
}

export function buildOperationsHealth(): OperationsHealth {
  const config = getOperationsConfig();
  const stream = getStreamState();
  const delivery = getDeliveryStats();
  const telegram = new TelegramAlertChannel();

  const wtiOnline = stream.quotes.some((q) => q.symbol === "WTI" && q.dataAvailability !== "UNAVAILABLE");
  const brentOnline = stream.quotes.some((q) => q.symbol === "BRENT" && q.dataAvailability !== "UNAVAILABLE");

  return {
    marketMonitoring: config.marketMonitoringEnabled
      ? wtiOnline && brentOnline
        ? "ACTIVE"
        : stream.lastPollAt
          ? "DEGRADED"
          : "OFFLINE"
      : "OFFLINE",
    newsMonitoring: config.newsMonitoringEnabled ? workerStatus("news") : "OFFLINE",
    alertEngine: config.alertDeliveryEnabled ? workerStatus("alert") : "OFFLINE",
    telegram: telegram.isEnabled() ? (workerStatus("alert") === "OFFLINE" ? "DEGRADED" : "ACTIVE") : "OFFLINE",
    webPush: config.webPushEnabled ? "DEGRADED" : "OFFLINE",
    lastPipelineRunAt,
    workers: getWorkerHeartbeats(),
    jobsProcessed,
    alertsGenerated: delivery.generated,
    alertsSuppressed: delivery.suppressed,
    alertsFailed: delivery.failed,
    isBackgroundActive: config.backgroundWorkersEnabled,
    hostingNote:
      "Vercel serverless: use /api/market/worker/tick cron + scripts/aaryx-worker.ts. Enable MI_PERSISTENCE_ENABLED + SUPABASE_SERVICE_ROLE_KEY for cross-instance state.",
  };
}

export function runWatchdog(): { healthy: boolean; issues: string[] } {
  const health = buildOperationsHealth();
  const issues: string[] = [];

  if (health.marketMonitoring === "OFFLINE") issues.push("Market monitoring offline");
  if (health.newsMonitoring === "OFFLINE") issues.push("News monitoring offline");
  if (health.workers.some((w) => w.status === "OFFLINE")) {
    issues.push(`Workers offline: ${health.workers.filter((w) => w.status === "OFFLINE").map((w) => w.workerType).join(", ")}`);
  }
  if (health.lastPipelineRunAt) {
    const age = Date.now() - new Date(health.lastPipelineRunAt).getTime();
    if (age > 300_000) issues.push("Pipeline stale (>5min)");
  }

  return { healthy: issues.length === 0, issues };
}

export function resetWatchdogState(): void {
  lastPipelineRunAt = null;
  jobsProcessed = 0;
}
