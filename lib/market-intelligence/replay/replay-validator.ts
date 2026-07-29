import { shouldRouteToChannel } from "@/lib/market-intelligence/operations/alert-formatter";
import type { DeliveredAlert, IntelligenceEventCluster, MarketEvent, PipelineLatency } from "@/lib/types/market";
import type {
  ReplayMetrics,
  ReplayScenarioExpectations,
  ReplayScenarioId,
  ReplayStageTiming,
  ReplayValidationResult,
} from "@/lib/market-intelligence/replay/replay-types";

export function buildStageTiming(input: {
  marketEvents: MarketEvent[];
  clusters: IntelligenceEventCluster[];
  alerts: DeliveredAlert[];
  latency?: Partial<PipelineLatency>;
}): ReplayStageTiming {
  const event = input.marketEvents[0];
  const cluster = input.clusters[0];
  const alert = input.alerts[0];

  return {
    marketMoveStartedAt: event?.timestamp,
    anomalyDetectedAt: event?.detectedAt ?? event?.timestamp,
    firstNewsAt: cluster?.firstReportAt,
    verificationStatus: cluster?.verification.status,
    aiCompletedAt: cluster?.timestamps?.aiAnalysisCompletedAt ?? input.latency?.aiCompletedAt,
    alertQueuedAt: alert?.latency?.alertQueuedAt ?? input.latency?.alertQueuedAt,
    alertSentAt: alert?.latency?.alertSentAt ?? input.latency?.alertSentAt,
  };
}

export function computeReplayMetrics(input: {
  stages: ReplayStageTiming;
  marketEvents: MarketEvent[];
  clusters: IntelligenceEventCluster[];
  alertsGenerated: number;
  alertsSuppressed: number;
  alerts: DeliveredAlert[];
  latency?: Partial<PipelineLatency>;
}): ReplayMetrics {
  const stages = input.stages;
  const highestSeverity = input.alerts.reduce<DeliveredAlert["severity"] | undefined>((best, a) => {
    if (!best) return a.severity;
    const ranks: Record<string, number> = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    return (ranks[a.severity] ?? 0) > (ranks[best] ?? 0) ? a.severity : best;
  }, undefined);

  const marketMs = stages.marketMoveStartedAt && stages.anomalyDetectedAt
    ? new Date(stages.anomalyDetectedAt).getTime() - new Date(stages.marketMoveStartedAt).getTime()
    : undefined;

  const detectionToNewsMs =
    stages.anomalyDetectedAt && stages.firstNewsAt
      ? new Date(stages.firstNewsAt).getTime() - new Date(stages.anomalyDetectedAt).getTime()
      : undefined;

  const marketToAlertMs =
    stages.marketMoveStartedAt && stages.alertSentAt
      ? new Date(stages.alertSentAt).getTime() - new Date(stages.marketMoveStartedAt).getTime()
      : input.latency?.marketToAlertMs;

  const aiLatencyMs =
    stages.aiCompletedAt && stages.anomalyDetectedAt
      ? new Date(stages.aiCompletedAt).getTime() - new Date(stages.anomalyDetectedAt).getTime()
      : input.latency?.aiLatencyMs;

  const anomalyDetected = input.marketEvents.some(
    (e) => e.severity === "HIGH" || e.severity === "CRITICAL" || e.eventType === "OIL_MARKET_ANOMALY",
  );

  const missedEvent =
    input.clusters.length === 0 && input.marketEvents.length === 0 && input.alerts.length === 0;

  const falsePositive =
    input.alerts.some((a) => a.severity === "CRITICAL" || a.severity === "HIGH") &&
    !anomalyDetected &&
    input.clusters.every((c) => c.verification.status === "UNVERIFIED" || c.independentSourceCount <= 1);

  return {
    marketToDetectionMs: marketMs,
    detectionToFirstNewsMs: detectionToNewsMs,
    newsToAlertMs: input.latency?.newsToAlertMs,
    marketToAlertMs,
    aiLatencyMs,
    alertsGenerated: input.alertsGenerated,
    alertsSuppressed: input.alertsSuppressed,
    anomalyDetected,
    clusterCount: input.clusters.length,
    highestSeverity,
    falsePositive,
    missedEvent,
    latency: input.latency ?? {},
  };
}

function severityRank(severity: string): number {
  const ranks: Record<string, number> = { INFO: 0, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  return ranks[severity] ?? 0;
}

export function validateReplayExpectations(
  scenarioId: ReplayScenarioId,
  expectations: ReplayScenarioExpectations,
  metrics: ReplayMetrics,
  alerts: DeliveredAlert[],
): { passed: boolean; failures: string[]; warnings: string[] } {
  const failures: string[] = [];
  const warnings: string[] = [];

  if (expectations.expectAnomaly === true && !metrics.anomalyDetected) {
    failures.push("Expected market anomaly but none detected");
  }
  if (expectations.expectAnomaly === false && metrics.anomalyDetected) {
    warnings.push("Unexpected market anomaly detected in noise scenario");
  }

  if (expectations.minSeverity && metrics.highestSeverity) {
    if (severityRank(metrics.highestSeverity) < severityRank(expectations.minSeverity)) {
      failures.push(`Severity ${metrics.highestSeverity} below minimum ${expectations.minSeverity}`);
    }
  }

  if (expectations.maxSeverity && metrics.highestSeverity) {
    if (severityRank(metrics.highestSeverity) > severityRank(expectations.maxSeverity)) {
      failures.push(`Severity ${metrics.highestSeverity} above maximum ${expectations.maxSeverity}`);
    }
  }

  if (expectations.minAlerts != null && alerts.length < expectations.minAlerts) {
    failures.push(`Expected at least ${expectations.minAlerts} alerts, got ${alerts.length}`);
  }

  if (expectations.maxAlerts != null && alerts.length > expectations.maxAlerts) {
    failures.push(`Expected at most ${expectations.maxAlerts} alerts, got ${alerts.length}`);
  }

  if (expectations.expectTelegramRoute && metrics.highestSeverity) {
    if (!shouldRouteToChannel("TELEGRAM", metrics.highestSeverity)) {
      failures.push("Expected Telegram routing for severity but channel would be suppressed");
    }
  }

  if (expectations.expectUpdateAlert) {
    const updates = alerts.filter((a) => a.alertType === "UPDATE");
    if (updates.length < 1) failures.push("Expected at least one UPDATE alert");
    if (alerts.filter((a) => a.alertType === "NEW").length < 1) {
      failures.push("Expected initial NEW alert before UPDATE");
    }
  }

  if (expectations.expectRetraction) {
    const retractions = alerts.filter((a) => a.alertType === "RETRACTION");
    if (retractions.length < 1 && !alerts.some((a) => a.verification === "RETRACTED")) {
      warnings.push("Retraction scenario — no RETRACTION alert (cluster may show RETRACTED state only)");
    }
  }

  if (expectations.maxMarketToAlertMs != null && metrics.marketToAlertMs != null) {
    if (metrics.marketToAlertMs > expectations.maxMarketToAlertMs) {
      failures.push(
        `Market→Alert latency ${metrics.marketToAlertMs}ms exceeds max ${expectations.maxMarketToAlertMs}ms`,
      );
    }
  }

  if (metrics.falsePositive) {
    failures.push("Detected likely false positive (HIGH/CRITICAL alert without verified anomaly)");
  }

  return { passed: failures.length === 0, failures, warnings };
}

export function buildValidationResult(input: {
  scenarioId: ReplayScenarioId;
  expectations: ReplayScenarioExpectations;
  marketEvents: MarketEvent[];
  clusters: IntelligenceEventCluster[];
  alerts: DeliveredAlert[];
  alertsGenerated: number;
  alertsSuppressed: number;
  latency?: Partial<PipelineLatency>;
}): ReplayValidationResult {
  const stages = buildStageTiming(input);
  const metrics = computeReplayMetrics({ ...input, stages });
  const check = validateReplayExpectations(input.scenarioId, input.expectations, metrics, input.alerts);

  return {
    scenarioId: input.scenarioId,
    passed: check.passed,
    failures: check.failures,
    warnings: check.warnings,
    metrics,
    stages,
    marketEvents: input.marketEvents,
    clusters: input.clusters,
    alerts: input.alerts,
  };
}
