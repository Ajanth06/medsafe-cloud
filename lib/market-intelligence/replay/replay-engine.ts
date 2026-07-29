import { runEventPipeline } from "@/lib/market-intelligence/engine/event-pipeline";
import { runAIAnalysisJob, resetAIAnalysisState } from "@/lib/market-intelligence/ai/ai-analysis-orchestrator";
import {
  processAlertsForDelivery,
  resetAlertDeliveryState,
  getDeliveryStats,
} from "@/lib/market-intelligence/operations/alert-delivery-engine";
import { resetInAppAlerts, getInAppAlerts } from "@/lib/market-intelligence/operations/in-app-alert-store";
import {
  buildReplayHistoryMap,
  buildReplayNews,
  buildReplayQuotes,
  seedReplayBuffer,
} from "@/lib/market-intelligence/replay/replay-data-builder";
import { setReplayContext } from "@/lib/market-intelligence/replay/replay-context";
import { getReplayScenario, listReplayScenarios } from "@/lib/market-intelligence/replay/replay-scenarios";
import type { ReplayRunResult, ReplayScenarioDefinition } from "@/lib/market-intelligence/replay/replay-types";
import { buildValidationResult } from "@/lib/market-intelligence/replay/replay-validator";
import { persistValidationRun } from "@/lib/market-intelligence/persistence/validation-repository";
import {
  resetNewsPipelineState,
  runNewsPipeline,
} from "@/lib/market-intelligence/services/news-intelligence-orchestrator";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";

export { listReplayScenarios, getReplayScenario };

function resetReplayState() {
  resetNewsPipelineState();
  resetAIAnalysisState();
  resetAlertDeliveryState();
  resetInAppAlerts();
}

export async function runReplayScenario(
  scenarioId: string,
  options?: { skipDelivery?: boolean },
): Promise<ReplayRunResult> {
  const scenario = getReplayScenario(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown replay scenario: ${scenarioId}`);
  }

  const started = Date.now();
  resetReplayState();

  const tickCount = scenario.ticks ?? 1;
  let lastPipeline: ReturnType<typeof runEventPipeline> | null = null;
  let lastNewsResult: Awaited<ReturnType<typeof runNewsPipeline>> | null = null;
  let allAlerts = getInAppAlerts({ tab: "ALL" });

  for (let tick = 0; tick < tickCount; tick++) {
    const anchorMs = new Date(scenario.anchorIso).getTime() + tick * 4 * 60_000;
    const newsItems = buildReplayNews(scenario, anchorMs, tick);

    setReplayContext({
      anchorMs,
      newsItems,
      disableDelivery: options?.skipDelivery,
      label: `${scenario.id}-tick-${tick}`,
    });

    const historyMap = buildReplayHistoryMap(scenario, anchorMs);
    const buffer = seedReplayBuffer(scenario, anchorMs);
    const quotes = buildReplayQuotes(anchorMs, historyMap);

    const pipeline = runEventPipeline(quotes, buffer, anchorMs);
    lastPipeline = pipeline;

    const newsResult = await runNewsPipeline(pipeline);
    lastNewsResult = newsResult;

    for (let i = 0; i < newsResult.intelligenceEvents.length; i++) {
      const cluster = newsResult.intelligenceEvents[i];
      if (cluster.priority === "CRITICAL" || cluster.priority === "HIGH" || cluster.priorityScore >= 60) {
        try {
          const marketEvent = pipeline.marketEvents[0];
          const { cluster: updated } = await runAIAnalysisJob({
            cluster,
            pipeline,
            marketEvent,
            force: true,
          });
          newsResult.intelligenceEvents[i] = updated;
        } catch (error) {
          marketLogger.warn("Replay AI analysis skipped", {
            scenario: scenario.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    if (!options?.skipDelivery) {
      await processAlertsForDelivery({
        alerts: newsResult.intelligenceAlerts,
        clusters: newsResult.intelligenceEvents,
        latency: {
          marketEventCreatedAt: pipeline.marketEvents[0]?.detectedAt,
          aiCompletedAt: newsResult.intelligenceEvents[0]?.timestamps?.aiAnalysisCompletedAt,
        },
      });
    }

    allAlerts = getInAppAlerts({ tab: "ALL" });

    if (tick > 0 && scenario.id === "material-update-confirmation") {
      resetNewsPipelineState();
    }
  }

  setReplayContext(null);

  const deliveryStats = getDeliveryStats();
  const validation = buildValidationResult({
    scenarioId: scenario.id,
    expectations: scenario.expectations,
    marketEvents: lastPipeline?.marketEvents ?? [],
    clusters: lastNewsResult?.intelligenceEvents ?? [],
    alerts: allAlerts,
    alertsGenerated: deliveryStats.generated,
    alertsSuppressed: deliveryStats.suppressed,
    latency: allAlerts[0]?.latency,
  });

  void persistValidationRun({
    runType: "REPLAY",
    scenarioId: scenario.id,
    passed: validation.passed,
    totalScenarios: 1,
    passedScenarios: validation.passed ? 1 : 0,
    failedScenarios: validation.passed ? 0 : 1,
    metrics: validation.metrics as unknown as Record<string, unknown>,
    failures: validation.failures,
    warnings: validation.warnings,
    durationMs: Date.now() - started,
  });

  return {
    scenario,
    validation,
    durationMs: Date.now() - started,
  };
}

export async function runAllReplayScenarios(): Promise<ReplayRunResult[]> {
  const results: ReplayRunResult[] = [];
  for (const scenario of listReplayScenarios()) {
    results.push(await runReplayScenario(scenario.id));
  }
  return results;
}

export async function runReplayScenarioDirect(
  scenario: ReplayScenarioDefinition,
  options?: { skipDelivery?: boolean },
): Promise<ReplayRunResult> {
  const existing = getReplayScenario(scenario.id);
  if (!existing) {
    throw new Error(`Scenario ${scenario.id} not registered`);
  }
  return runReplayScenario(scenario.id, options);
}
