import { generateMockSnapshots } from "@/lib/market-intelligence/engine/anomaly-detection";
import { seedBufferFromHistory } from "@/lib/market-intelligence/engine/event-pipeline";
import { getPriceHistoryBuffer, resetPriceHistoryBuffer } from "@/lib/market-intelligence/engine/price-history-buffer";
import { getDemoNewsScenario } from "@/lib/market-intelligence/providers/news/development-news-provider";
import { normalizeNewsItem } from "@/lib/market-intelligence/services/news-normalizer";
import type { NormalizedMarketQuote, NormalizedNewsItem } from "@/lib/types/market";
import type { ReplayScenarioDefinition } from "@/lib/market-intelligence/replay/replay-types";

import { MARKET_ASSETS } from "@/lib/market-intelligence/config/assets";

const ASSET_META = Object.fromEntries(MARKET_ASSETS.map((a) => [a.symbol, a]));

export function buildReplayHistoryMap(
  scenario: ReplayScenarioDefinition,
  anchorMs: number,
): Map<string, { assetId: string; snapshots: { price: number; timestamp: string }[] }> {
  const wtiBase = scenario.wtiBase ?? 85.0;
  const brentBase = scenario.brentBase ?? 87.5;

  const wtiSnaps = generateMockSnapshots("WTI", "wti", wtiBase, scenario.wtiChanges, anchorMs);
  const brentSnaps = generateMockSnapshots("BRENT", "brent", brentBase, scenario.brentChanges, anchorMs);

  return new Map([
    ["WTI", { assetId: "wti", snapshots: wtiSnaps }],
    ["BRENT", { assetId: "brent", snapshots: brentSnaps }],
  ]);
}

export function seedReplayBuffer(scenario: ReplayScenarioDefinition, anchorMs: number) {
  resetPriceHistoryBuffer();
  const buffer = getPriceHistoryBuffer();
  seedBufferFromHistory(buffer, buildReplayHistoryMap(scenario, anchorMs));
  return buffer;
}

export function buildReplayQuotes(anchorMs: number, historyMap: ReturnType<typeof buildReplayHistoryMap>): NormalizedMarketQuote[] {
  const quotes: NormalizedMarketQuote[] = [];

  for (const [symbol, entry] of historyMap) {
    const last = entry.snapshots[entry.snapshots.length - 1];
    if (!last) continue;
    const first = entry.snapshots[0];
    const change = first ? last.price - first.price : 0;
    const changePct = first && first.price > 0 ? (change / first.price) * 100 : 0;
    const meta = ASSET_META[symbol];

    quotes.push({
      assetId: entry.assetId,
      symbol,
      providerSymbol: meta?.providerSymbol ?? symbol,
      name: meta?.name ?? symbol,
      assetClass: meta?.assetClass ?? "commodity",
      price: last.price,
      previousClose: first?.price ?? last.price,
      absoluteChange: change,
      percentageChange: changePct,
      timestamp: new Date(anchorMs).toISOString(),
      receivedAt: new Date(anchorMs).toISOString(),
      processedAt: new Date(anchorMs).toISOString(),
      marketStatus: "OPEN",
      dataAvailability: "DEMO",
      isRealtime: false,
      source: "replay-fixture",
      staleAfterSeconds: 300,
    });
  }

  return quotes;
}

export function buildReplayNews(
  scenario: ReplayScenarioDefinition,
  anchorMs: number,
  tick = 0,
): NormalizedNewsItem[] {
  const raw = getDemoNewsScenario(scenario.newsScenario, anchorMs);

  if (scenario.id === "material-update-confirmation" && tick === 1) {
    return raw.map((item, i) =>
      normalizeNewsItem(
        {
          ...item,
          id: `${item.id}-confirmed`,
          title: i === raw.length - 1 ? "Official confirmation: regional security incident (DEMO)" : item.title,
          isOfficialSource: i === raw.length - 1 ? true : item.isOfficialSource,
          publishedAt: new Date(anchorMs + (i + 1) * 60_000).toISOString(),
          summary: "Official sources confirm earlier reports affecting energy shipping routes.",
        },
        "replay",
      ),
    );
  }

  return raw.map((item) => normalizeNewsItem(item, "replay"));
}
