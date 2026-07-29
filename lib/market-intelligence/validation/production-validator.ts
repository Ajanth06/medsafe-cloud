import { isMiPersistenceEnabled } from "@/lib/market-intelligence/persistence/config";
import { listValidationRuns } from "@/lib/market-intelligence/persistence/validation-repository";
import { buildOperationsHealth, runWatchdog } from "@/lib/market-intelligence/operations/system-watchdog";
import { getDeliveryStats } from "@/lib/market-intelligence/operations/alert-delivery-engine";
import { getJobStats } from "@/lib/market-intelligence/operations/job-queue";
import { getProviderHealthRecords } from "@/lib/market-intelligence/providers/provider-health-store";
import { buildSystemHealth } from "@/lib/market-intelligence/providers/provider-health";
import { getStreamState } from "@/lib/market-intelligence/services/market-stream-service";
import { isServiceClientConfigured } from "@/lib/supabase/admin";

export interface ProductionValidationReport {
  generatedAt: string;
  environment: string;
  overallStatus: "HEALTHY" | "DEGRADED" | "CRITICAL";
  checks: {
    id: string;
    name: string;
    status: "PASS" | "WARN" | "FAIL";
    detail: string;
  }[];
  metrics: {
    persistenceEnabled: boolean;
    serviceRoleConfigured: boolean;
    isLive: boolean;
    alertsGenerated: number;
    alertsSuppressed: number;
    jobsPending: number;
    jobsDeadLetter: number;
    providerHealthCount: number;
    recentValidationRuns: number;
    replayPassRate: number | null;
  };
  recentRuns: Awaited<ReturnType<typeof listValidationRuns>>;
}

export async function buildProductionValidationReport(): Promise<ProductionValidationReport> {
  const state = getStreamState();
  const systemHealth = await buildSystemHealth({
    lastPollAt: state.lastPollAt,
    lastError: state.lastError,
    websocketState: state.websocketState,
    isDemo: state.isDemo,
    quotes: state.quotes,
  });
  const ops = buildOperationsHealth();
  const watchdog = runWatchdog();
  const delivery = getDeliveryStats();
  const jobs = getJobStats();
  const recentRuns = await listValidationRuns(10);

  const replayRuns = recentRuns.filter((r) => r.runType === "REPLAY");
  const replayPassed = replayRuns.filter((r) => r.passed).length;
  const replayPassRate = replayRuns.length > 0 ? Math.round((replayPassed / replayRuns.length) * 100) : null;

  const checks: ProductionValidationReport["checks"] = [];

  checks.push({
    id: "supabase",
    name: "Supabase service role",
    status: isServiceClientConfigured() ? "PASS" : "WARN",
    detail: isServiceClientConfigured() ? "Configured" : "SUPABASE_SERVICE_ROLE_KEY missing — in-memory only",
  });

  checks.push({
    id: "persistence",
    name: "MI persistence",
    status: isMiPersistenceEnabled() ? "PASS" : "WARN",
    detail: isMiPersistenceEnabled() ? "Active" : "Set MI_PERSISTENCE_ENABLED=true",
  });

  checks.push({
    id: "market-data",
    name: "Market data feed",
    status: systemHealth.isLive ? "PASS" : "WARN",
    detail: systemHealth.isLive ? "Live provider active" : "Demo mode — configure Polygon",
  });

  checks.push({
    id: "watchdog",
    name: "Operations watchdog",
    status: watchdog.healthy ? "PASS" : "FAIL",
    detail: watchdog.healthy ? "Nominal" : watchdog.issues.join("; "),
  });

  checks.push({
    id: "dead-letter",
    name: "Dead letter queue",
    status: jobs.deadLetter === 0 ? "PASS" : "WARN",
    detail: `${jobs.deadLetter} dead-letter jobs`,
  });

  checks.push({
    id: "stream-error",
    name: "Last market poll",
    status: state.lastError ? "FAIL" : "PASS",
    detail: state.lastError ?? `OK — ${state.lastPollAt ?? "never"}`,
  });

  const failCount = checks.filter((c) => c.status === "FAIL").length;
  const warnCount = checks.filter((c) => c.status === "WARN").length;
  const overallStatus = failCount > 0 ? "CRITICAL" : warnCount > 0 ? "DEGRADED" : "HEALTHY";

  return {
    generatedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? "development",
    overallStatus,
    checks,
    metrics: {
      persistenceEnabled: isMiPersistenceEnabled(),
      serviceRoleConfigured: isServiceClientConfigured(),
      isLive: systemHealth.isLive,
      alertsGenerated: delivery.generated,
      alertsSuppressed: delivery.suppressed,
      jobsPending: jobs.pending,
      jobsDeadLetter: jobs.deadLetter,
      providerHealthCount: getProviderHealthRecords().length,
      recentValidationRuns: recentRuns.length,
      replayPassRate,
    },
    recentRuns,
  };
}
