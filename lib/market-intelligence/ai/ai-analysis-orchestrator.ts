import { getAIProviderConfig, AI_TRIGGER_THRESHOLDS } from "@/lib/market-intelligence/config/ai-config";
import { aiContextBuilder } from "@/lib/market-intelligence/ai/ai-context-builder";
import { createAIProvider } from "@/lib/market-intelligence/providers/ai/ai-provider-factory";
import type { AIProviderAnalyzeInput } from "@/lib/market-intelligence/providers/ai/ai-provider-types";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import { isMiPersistenceEnabled } from "@/lib/market-intelligence/persistence/config";
import { persistAIAnalysis, persistIntelligenceCluster } from "@/lib/market-intelligence/persistence/intelligence-repository";
import type {
  AIAnalysisJob,
  AIAnalysisResult,
  AIAnalysisVersion,
  IntelligenceEventCluster,
  MarketEvent,
} from "@/lib/types/market";
import type { PipelineResult } from "@/lib/market-intelligence/engine/event-pipeline";

const jobStore = new Map<string, AIAnalysisJob>();
const analysisStore = new Map<string, AIAnalysisVersion[]>();
const debounceMap = new Map<string, number>();
const pendingKeys = new Set<string>();

export function shouldTriggerAI(input: {
  cluster: IntelligenceEventCluster;
  marketEvent?: MarketEvent;
  verificationChanged?: boolean;
  manual?: boolean;
}): boolean {
  if (input.manual) return true;

  const { cluster, marketEvent } = input;
  if (marketEvent && (marketEvent.severity === "CRITICAL" || marketEvent.severity === "HIGH")) return true;
  if (cluster.priorityScore >= AI_TRIGGER_THRESHOLDS.minPriorityScore) return true;
  if (input.verificationChanged) return true;
  if (cluster.verification.hasOfficialSource && cluster.independentSourceCount >= 2) return true;
  if (cluster.verification.status === "CONFLICTING") return true;

  return false;
}

export async function runAIAnalysisJob(input: {
  cluster: IntelligenceEventCluster;
  pipeline: PipelineResult;
  marketEvent?: MarketEvent;
  trigger?: AIProviderAnalyzeInput["trigger"];
  force?: boolean;
}): Promise<{ cluster: IntelligenceEventCluster; job: AIAnalysisJob }> {
  const config = getAIProviderConfig();
  const trigger = input.trigger ?? "INITIAL";
  const debounceKey = `${input.cluster.id}:${trigger}`;

  if (!input.force && !shouldTriggerAI({ cluster: input.cluster, marketEvent: input.marketEvent })) {
    const job: AIAnalysisJob = {
      id: `job-skipped-${Date.now()}`,
      eventId: input.cluster.id,
      status: "CANCELLED",
      trigger,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    return { cluster: input.cluster, job };
  }

  const lastRun = debounceMap.get(debounceKey);
  if (!input.force && lastRun && Date.now() - lastRun < config.debounceMs) {
    const job: AIAnalysisJob = {
      id: `job-debounced-${Date.now()}`,
      eventId: input.cluster.id,
      status: "CANCELLED",
      trigger,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      error: "Debounced",
    };
    return { cluster: input.cluster, job };
  }

  if (pendingKeys.has(debounceKey)) {
    const job: AIAnalysisJob = {
      id: `job-pending-${Date.now()}`,
      eventId: input.cluster.id,
      status: "PENDING",
      trigger,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    return { cluster: input.cluster, job };
  }

  pendingKeys.add(debounceKey);
  debounceMap.set(debounceKey, Date.now());

  const jobId = `job-${input.cluster.id}-${Date.now()}`;
  const job: AIAnalysisJob = {
    id: jobId,
    eventId: input.cluster.id,
    status: "RUNNING",
    trigger,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    retryCount: 0,
  };
  jobStore.set(jobId, job);

  try {
    const context = await aiContextBuilder.build({
      cluster: input.cluster,
      pipeline: input.pipeline,
      marketEvent: input.marketEvent,
    });

    const previousVersions = analysisStore.get(input.cluster.id) ?? [];
    const previousAnalysis = previousVersions[previousVersions.length - 1]?.analysis;

    const provider = createAIProvider();
    const providerInput: AIProviderAnalyzeInput = {
      context,
      cluster: input.cluster,
      marketEvent: input.marketEvent,
      previousAnalysis,
      trigger,
    };

    const result =
      trigger === "UPDATE" && previousAnalysis
        ? await provider.updateExistingAnalysis(providerInput)
        : await provider.analyzeIntelligenceEvent(providerInput);

    const version: AIAnalysisVersion = {
      id: result.analysis.id,
      version: result.analysis.version,
      analysis: result.analysis,
      createdAt: result.analysis.generatedAt,
      trigger,
    };

    const versions = [...previousVersions, version];
    analysisStore.set(input.cluster.id, versions);

    const updatedCluster: IntelligenceEventCluster = {
      ...input.cluster,
      aiAnalysisResult: result.analysis,
      analysisVersions: versions,
      currentAnalysisId: result.analysis.id,
      state: "AI_ANALYZED",
      timestamps: {
        ...input.cluster.timestamps,
        aiAnalysisCompletedAt: result.analysis.generatedAt,
      },
    };

    job.status = "COMPLETED";
    job.completedAt = new Date().toISOString();
    jobStore.set(jobId, job);

    marketLogger.info("AI analysis completed", {
      eventId: input.cluster.id,
      mode: result.analysis.mode,
      latencyMs: result.analysis.metrics?.analysisLatencyMs,
    });

    if (isMiPersistenceEnabled()) {
      void persistIntelligenceCluster(updatedCluster);
      void persistAIAnalysis(input.cluster.id, result.analysis, input.marketEvent?.id);
    }

    return { cluster: updatedCluster, job };
  } catch (error) {
    job.status = "FAILED";
    job.error = error instanceof Error ? error.message : String(error);
    job.completedAt = new Date().toISOString();
    jobStore.set(jobId, job);

    marketLogger.error("AI analysis job failed", { eventId: input.cluster.id, error: job.error });

    return { cluster: input.cluster, job };
  } finally {
    pendingKeys.delete(debounceKey);
  }
}

export function getAnalysisVersions(eventId: string): AIAnalysisVersion[] {
  return analysisStore.get(eventId) ?? [];
}

export function getJob(jobId: string): AIAnalysisJob | undefined {
  return jobStore.get(jobId);
}

export function resetAIAnalysisState(): void {
  jobStore.clear();
  analysisStore.clear();
  debounceMap.clear();
  pendingKeys.clear();
}

export function toLegacyExtendedAnalysis(result: AIAnalysisResult): import("@/lib/types/market").ExtendedAIAnalysis {
  return {
    eventSummary: result.summary,
    eventType: result.eventType as import("@/lib/types/market").ExtendedAIAnalysis["eventType"],
    marketRegime: result.marketRegime === "RISK_ON" ? "RISK-ON" : result.marketRegime === "RISK_OFF" ? "RISK-OFF" : "NEUTRAL",
    affectedAssets: result.affectedAssets.map((a) => ({
      symbol: a.asset,
      name: a.asset,
      changePercent: 0,
    })),
    directionalImpact: Object.fromEntries(
      result.affectedAssets.map((a) => [a.asset, pressureToSentiment(a.pressure)]),
    ),
    confidence: result.confidence === "VERY_HIGH" || result.confidence === "HIGH" ? "HIGH" : result.confidence === "VERY_LOW" ? "LOW" : result.confidence as "MEDIUM",
    confidenceScore: result.confidenceScore,
    possibleCause: result.possibleCause.description,
    alternativeExplanation: result.alternativeExplanations.join("; ") || "None identified in available data.",
    keyRisks: result.keyRisks,
    whatToWatchNext: result.whatToWatchNext.map((w) => w.description),
    disclaimer: result.disclaimer,
  };
}

function pressureToSentiment(pressure: import("@/lib/types/market").AssetPressure): import("@/lib/types/market").MarketSentiment {
  if (pressure.includes("BULLISH")) return "BULLISH PRESSURE";
  if (pressure.includes("BEARISH")) return "BEARISH PRESSURE";
  return "NEUTRAL";
}
