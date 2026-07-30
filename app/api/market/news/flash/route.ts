import { NextResponse } from "next/server";
import { requireApiUserOrWorker } from "@/lib/market-intelligence/api/auth";
import { createNewsProvider } from "@/lib/market-intelligence/providers/news/news-provider-factory";
import type { NewsEvent, NormalizedNewsItem } from "@/lib/types/market";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toFlashEvent(item: NormalizedNewsItem): NewsEvent {
  const hot = item.entities?.includes("HOT") ?? false;
  const flash = item.entities?.includes("FLASH") ?? false;
  return {
    id: item.id,
    timestamp: item.publishedAt,
    title: item.title,
    summary: item.summary,
    eventType: item.categories[0] ?? "GEOPOLITICAL",
    severity: hot ? "HIGH" : flash ? "HIGH" : "MEDIUM",
    sourceVerification: {
      status: item.isOfficialSource ? "OFFICIAL_SOURCE" : "SINGLE_SOURCE",
      sourceCount: 1,
      sources: [item.sourceName ?? item.source],
      lastVerifiedAt: item.publishedAt,
      hasOfficialSource: Boolean(item.isOfficialSource),
    },
    affectedMarkets: [
      { symbol: "WTI", name: "WTI", changePercent: 0 },
      { symbol: "BRENT", name: "Brent", changePercent: 0 },
    ],
    status: "ACTIVE",
    isFlash: flash || hot,
    url: item.url,
  };
}

/**
 * Lightweight flash feed — Oil RSS only, no full pipeline reset.
 * Polled by the terminal so Iran/oil headlines land in Flash News quickly.
 */
export async function GET(request: Request) {
  const auth = await requireApiUserOrWorker(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const provider = createNewsProvider();
    const items = await provider.getBreakingNews(12);
    const breakingNews = items.map(toFlashEvent);

    return Response.json({
      breakingNews,
      provider: provider.id,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Flash news failed",
        breakingNews: [],
      },
      { status: 502 },
    );
  }
}
