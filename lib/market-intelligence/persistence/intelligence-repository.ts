import { getMiDb } from "@/lib/supabase/mi-db";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { AIAnalysisResult, IntelligenceEventCluster } from "@/lib/types/market";

export async function persistIntelligenceCluster(cluster: IntelligenceEventCluster): Promise<void> {
  const supabase = getMiDb();
  if (!supabase) return;

  const { error } = await supabase.from("mi_intelligence_event_clusters").upsert(
    {
      external_id: cluster.id,
      event_type: cluster.eventType,
      news_event_type: cluster.newsEventType,
      headline: cluster.headline,
      summary: cluster.summary,
      state: cluster.state,
      verification_status: cluster.verification.status,
      independent_source_count: cluster.independentSourceCount,
      official_source_count: cluster.officialSourceCount,
      first_report_at: cluster.firstReportAt,
      latest_update_at: cluster.latestUpdateAt,
      affected_region: cluster.affectedRegion ?? null,
      potentially_affected_markets: cluster.potentiallyAffectedMarkets,
      market_relevance: cluster.marketRelevance,
      priority: cluster.priority,
      priority_score: cluster.priorityScore,
      causality: cluster.causality,
      watch_mode: cluster.watchMode ?? false,
      data_availability: cluster.dataAvailability ?? "LIVE",
      timestamps: cluster.timestamps ?? {},
      audit_trail: cluster.auditTrail ?? [],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "external_id" },
  );

  if (error) marketLogger.warn("persist_cluster_failed", { clusterId: cluster.id, error: error.message });
}

export async function persistAIAnalysis(
  clusterId: string,
  analysis: AIAnalysisResult,
  marketEventId?: string,
): Promise<void> {
  const supabase = getMiDb();
  if (!supabase) return;

  const externalId = `ai-${clusterId}-v${analysis.version}`;

  const { data: inserted, error } = await supabase
    .from("mi_ai_analyses")
    .upsert(
      {
        external_id: externalId,
        intelligence_event_id: clusterId,
        market_event_id: marketEventId ?? null,
        version: analysis.version,
        is_current: true,
        summary: analysis.summary,
        event_type: analysis.eventType,
        market_regime: analysis.marketRegime,
        possible_cause: analysis.possibleCause.description,
        confidence_score: analysis.confidenceScore,
        confidence_level: analysis.confidence,
        market_already_moved: analysis.marketAlreadyMoved,
        reaction_phase: analysis.reactionPhase,
        event_significance: analysis.eventSignificance,
        model: analysis.model,
        prompt_version: analysis.promptVersion,
        mode: analysis.mode,
        generated_at: analysis.generatedAt,
        latency_ms: analysis.metrics?.analysisLatencyMs ?? null,
        alternative_explanations: analysis.alternativeExplanations,
        affected_assets: analysis.affectedAssets,
        confidence_reasons: analysis.confidenceReasons,
        uncertainty_reasons: analysis.uncertaintyReasons,
        key_risks: analysis.keyRisks,
        what_to_watch_next: analysis.whatToWatchNext,
        full_result: analysis,
      },
      { onConflict: "external_id" },
    )
    .select("id")
    .single();

  if (error) {
    marketLogger.warn("persist_ai_analysis_failed", { clusterId, error: error.message });
    return;
  }

  if (inserted?.id && analysis.evidence.length > 0) {
    const evidenceRows = analysis.evidence.map((e) => ({
      analysis_id: inserted.id,
      evidence_type: e.type,
      reference_id: e.id,
      label: e.label ?? null,
      supports_analysis: true,
    }));
    const { error: evError } = await supabase.from("mi_ai_analysis_evidence").insert(evidenceRows);
    if (evError) marketLogger.warn("persist_ai_evidence_failed", { error: evError.message });
  }
}
