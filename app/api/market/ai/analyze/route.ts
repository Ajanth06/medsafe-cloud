import { NextResponse } from "next/server";
import { requireApiUserOrWorker } from "@/lib/market-intelligence/api/auth";
import { withUserRateLimit } from "@/lib/market-intelligence/api/rate-limit";
import { runAIAnalysisJob, resetAIAnalysisState } from "@/lib/market-intelligence/ai/ai-analysis-orchestrator";
import { MARKET_ASSETS } from "@/lib/market-intelligence/config/assets";
import { runEventPipeline, seedBufferFromHistory } from "@/lib/market-intelligence/engine/event-pipeline";
import { getPriceHistoryBuffer, resetPriceHistoryBuffer } from "@/lib/market-intelligence/engine/price-history-buffer";
import { getDemoNewsScenario } from "@/lib/market-intelligence/providers/news/development-news-provider";
import { clusterNewsItems } from "@/lib/market-intelligence/services/event-clustering";
import { normalizeNewsItem } from "@/lib/market-intelligence/services/news-normalizer";
import { resetNewsPipelineState } from "@/lib/market-intelligence/services/news-intelligence-orchestrator";
import { MOCK_PRICE_HISTORY } from "@/lib/market-intelligence/mock-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireApiUserOrWorker(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.userId) {
    const limited = await withUserRateLimit(auth.userId, "aiAnalyze");
    if (limited) return limited;
  }

  const body = (await request.json().catch(() => ({}))) as { eventId?: string; force?: boolean };

  resetPriceHistoryBuffer();
  resetNewsPipelineState();
  resetAIAnalysisState();

  const buffer = getPriceHistoryBuffer();
  const historyMap = new Map<string, { assetId: string; snapshots: { price: number; timestamp: string }[] }>();
  for (const [symbol, snapshots] of MOCK_PRICE_HISTORY) {
    const asset = MARKET_ASSETS.find((a) => a.symbol === symbol);
    if (asset) historyMap.set(symbol, { assetId: asset.assetId, snapshots });
  }
  seedBufferFromHistory(buffer, historyMap);

  const pipeline = runEventPipeline([], buffer);
  const items = getDemoNewsScenario("market-first").map((n) => normalizeNewsItem(n, "development"));
  const clusters = clusterNewsItems(items, "DEMO");
  const cluster = clusters.find((c) => c.id === body.eventId) ?? clusters[0];

  const marketEvent = pipeline.marketEvents[0] ?? {
    id: "manual-anomaly",
    assetId: "wti",
    asset: "WTI Crude Oil",
    symbol: "WTI",
    direction: "UP" as const,
    percentageChange: 1.5,
    absoluteChange: 1.2,
    windowMinutes: 10,
    startPrice: 82,
    currentPrice: 83.2,
    detectedAt: new Date().toISOString(),
    severity: "HIGH" as const,
    eventType: "OIL_MARKET_ANOMALY" as const,
    status: "ACTIVE" as const,
    description: "WTI +1.5% / 10 min",
    priceChange: 1.2,
    priceChangePercent: 1.5,
    timestamp: new Date().toISOString(),
  };

  const { cluster: updated, job } = await runAIAnalysisJob({
    cluster,
    pipeline,
    marketEvent,
    trigger: "MANUAL",
    force: body.force ?? true,
  });

  return Response.json({
    analysis: updated.aiAnalysisResult,
    versions: updated.analysisVersions,
    job,
  });
}
