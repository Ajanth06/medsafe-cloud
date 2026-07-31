import { getOperationsConfig } from "@/lib/market-intelligence/config/operations-config";
import { processAlertsForDelivery } from "@/lib/market-intelligence/operations/alert-delivery-engine";
import { filterOilIntelligenceAlerts } from "@/lib/market-intelligence/operations/oil-alert-scope";
import { recordHeartbeat } from "@/lib/market-intelligence/operations/heartbeat";
import { claimJob, claimJobAsync, completeJob, failJob } from "@/lib/market-intelligence/operations/job-queue";
import { hydrateOperationsFromDb } from "@/lib/market-intelligence/persistence/hydrate";
import { isMiPersistenceEnabled } from "@/lib/market-intelligence/persistence/config";
import { processPerformanceSnapshotJobs } from "@/lib/market-intelligence/operations/performance-snapshot-scheduler";
import { buildOperationsHealth, recordPipelineRun, runWatchdog } from "@/lib/market-intelligence/operations/system-watchdog";
import { InAppAlertChannel } from "@/lib/market-intelligence/operations/channels/in-app-channel";
import { TelegramAlertChannel } from "@/lib/market-intelligence/operations/channels/telegram-channel";
import { getAlertById } from "@/lib/market-intelligence/operations/in-app-alert-store";
import { runAIAnalysisJob } from "@/lib/market-intelligence/ai/ai-analysis-orchestrator";
import { pollMarketData, getStreamState } from "@/lib/market-intelligence/services/market-stream-service";
import { runNewsPipeline } from "@/lib/market-intelligence/services/news-intelligence-orchestrator";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { OperationsHealth } from "@/lib/types/market";

export interface OperationsTickResult {
  success: boolean;
  health: OperationsHealth;
  alertsDelivered: number;
  jobsProcessed: number;
  watchdogIssues: string[];
}

async function retryAlertDeliveries(): Promise<number> {
  let retried = 0;
  while (true) {
    const job = isMiPersistenceEnabled() ? await claimJobAsync("ALERT_DELIVERY") : claimJob("ALERT_DELIVERY");
    if (!job) break;

    try {
      const alertId = String(job.payload?.alertId ?? "");
      const alert = getAlertById(alertId);
      if (!alert) {
        completeJob(job.id);
        continue;
      }

      const channel = job.payload?.channel === "TELEGRAM" ? new TelegramAlertChannel() : new InAppAlertChannel();
      const result = await channel.send(alert);
      if (result.success) {
        completeJob(job.id);
        retried += 1;
      } else {
        failJob(job.id, result.error ?? "Delivery failed");
      }
    } catch (error) {
      failJob(job.id, error instanceof Error ? error.message : String(error));
    }
  }
  return retried;
}

export async function runOperationsTick(): Promise<OperationsTickResult> {
  const config = getOperationsConfig();
  marketLogger.info("worker_started", { tick: true });

  if (isMiPersistenceEnabled()) {
    await hydrateOperationsFromDb();
  }

  if (!config.backgroundWorkersEnabled) {
    return {
      success: false,
      health: buildOperationsHealth(),
      alertsDelivered: 0,
      jobsProcessed: 0,
      watchdogIssues: ["Background workers disabled"],
    };
  }

  let alertsDelivered = 0;
  let jobsProcessed = 0;

  if (config.marketMonitoringEnabled) {
    recordHeartbeat("market-monitor", "market");
    await pollMarketData();
  }

  const stream = getStreamState();
  const pipeline = stream.pipeline;

  let newsAlerts = pipeline?.intelligenceAlerts ?? [];
  let newsClusters: Awaited<ReturnType<typeof runNewsPipeline>>["intelligenceEvents"] = [];

  if (config.newsMonitoringEnabled && pipeline) {
    recordHeartbeat("news-investigator", "news");
    const newsResult = await runNewsPipeline(pipeline);
    newsAlerts = newsResult.intelligenceAlerts;
    newsClusters = newsResult.intelligenceEvents;

    if (config.aiAnalysisEnabled) {
      recordHeartbeat("ai-analyzer", "ai");
      for (const cluster of newsResult.intelligenceEvents) {
        if (cluster.priority === "CRITICAL" || cluster.priority === "HIGH") {
          try {
            await runAIAnalysisJob({ cluster, pipeline, trigger: "INITIAL" });
          } catch (error) {
            marketLogger.warn("AI analysis failed in operations tick", {
              clusterId: cluster.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    }
  }

  // Market-only alerts still deliver when news monitoring is off — oil scope only
  newsAlerts = filterOilIntelligenceAlerts(newsAlerts);

  if (config.alertDeliveryEnabled && newsAlerts.length > 0) {
    recordHeartbeat("alert-delivery", "alert");
    const delivery = await processAlertsForDelivery({
      alerts: newsAlerts,
      clusters: newsClusters,
      latency: {
        marketEventCreatedAt: pipeline?.marketEvents[0]?.detectedAt,
      },
    });
    alertsDelivered = delivery.delivered.length;
  }

  jobsProcessed += await retryAlertDeliveries();
  jobsProcessed += await processPerformanceSnapshotJobs();

  recordHeartbeat("system-watchdog", "watchdog");
  recordPipelineRun();

  const watchdog = runWatchdog();
  const health = buildOperationsHealth();

  marketLogger.info("worker_stopped", { alertsDelivered, jobsProcessed });

  return {
    success: true,
    health,
    alertsDelivered,
    jobsProcessed,
    watchdogIssues: watchdog.issues,
  };
}

export { sendTestAlert } from "@/lib/market-intelligence/operations/channels/telegram-channel";
