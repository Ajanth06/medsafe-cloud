import { NextResponse } from "next/server";
import { requireApiUserOrWorker } from "@/lib/market-intelligence/api/auth";
import { MARKET_ASSETS } from "@/lib/market-intelligence/config/assets";
import { runEventPipeline, seedBufferFromHistory } from "@/lib/market-intelligence/engine/event-pipeline";
import { getPriceHistoryBuffer, resetPriceHistoryBuffer } from "@/lib/market-intelligence/engine/price-history-buffer";
import { MOCK_PRICE_HISTORY } from "@/lib/market-intelligence/mock-data";
import { runNewsPipeline, resetNewsPipelineState } from "@/lib/market-intelligence/services/news-intelligence-orchestrator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireApiUserOrWorker(request);
  if (auth instanceof NextResponse) return auth;

  resetPriceHistoryBuffer();
  resetNewsPipelineState();

  const buffer = getPriceHistoryBuffer();
  const historyMap = new Map<string, { assetId: string; snapshots: { price: number; timestamp: string }[] }>();
  for (const [symbol, snapshots] of MOCK_PRICE_HISTORY) {
    const asset = MARKET_ASSETS.find((a) => a.symbol === symbol);
    if (asset) historyMap.set(symbol, { assetId: asset.assetId, snapshots });
  }
  seedBufferFromHistory(buffer, historyMap);

  const marketPipeline = runEventPipeline([], buffer);
  const newsResult = await runNewsPipeline(marketPipeline);

  return Response.json({
    intelligenceEvents: newsResult.intelligenceEvents,
    breakingNews: newsResult.breakingNews,
    timeline: newsResult.timeline,
    newsHealth: newsResult.newsHealth,
  });
}
