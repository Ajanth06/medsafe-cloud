import { MARKET_ASSETS } from "@/lib/market-intelligence/config/assets";
import { generateMockSnapshots } from "@/lib/market-intelligence/engine/anomaly-detection";
import type {
  IntelligenceEvent,
  MarketAlert,
  MarketEvent,
  NewsEvent,
  NormalizedMarketQuote,
} from "@/lib/types/market";

const now = Date.now();

function minutesAgo(minutes: number) {
  return new Date(now - minutes * 60_000).toISOString();
}

function buildHistory(
  symbol: string,
  assetId: string,
  basePrice: number,
  minuteChanges: number[],
) {
  return generateMockSnapshots(symbol, assetId, basePrice, minuteChanges, now);
}

/** 60-minute price histories per asset for anomaly detection. */
export const MOCK_PRICE_HISTORY = new Map<
  string,
  { price: number; timestamp: string }[]
>();

const histories: {
  symbol: string;
  assetId: string;
  base: number;
  changes: number[];
  dailyChange: number;
}[] = [
  {
    symbol: "WTI",
    assetId: "wti",
    base: 85.0,
    changes: Array(50).fill(0).map((_, i) => (i > 40 ? 0.08 + i * 0.02 : 0.01)),
    dailyChange: 3.8,
  },
  {
    symbol: "BRENT",
    assetId: "brent",
    base: 87.5,
    changes: Array(50).fill(0).map((_, i) => (i > 40 ? 0.07 + i * 0.018 : 0.012)),
    dailyChange: 3.5,
  },
  {
    symbol: "GOLD",
    assetId: "gold",
    base: 2320,
    changes: Array(50).fill(0).map((_, i) => (i > 35 ? 0.4 + i * 0.05 : 0.1)),
    dailyChange: 1.01,
  },
  {
    symbol: "DAX",
    assetId: "dax",
    base: 18550,
    changes: Array(50).fill(0).map((_, i) => (i > 40 ? -3 - i * 0.5 : -0.5)),
    dailyChange: -0.77,
  },
  {
    symbol: "NDX",
    assetId: "ndx",
    base: 20450,
    changes: Array(50).fill(0).map((_, i) => (i > 40 ? -5 - i * 0.8 : -1)),
    dailyChange: -1.53,
  },
  {
    symbol: "SPX",
    assetId: "spx",
    base: 5245,
    changes: Array(50).fill(0).map((_, i) => (i > 42 ? -0.8 : -0.2)),
    dailyChange: -0.54,
  },
  {
    symbol: "EURUSD",
    assetId: "eurusd",
    base: 1.0865,
    changes: Array(50).fill(0).map(() => -0.00005),
    dailyChange: -0.21,
  },
  {
    symbol: "BTC",
    assetId: "btc",
    base: 70000,
    changes: Array(50).fill(0).map((_, i) => (i > 35 ? -40 - i * 5 : -5)),
    dailyChange: -3.06,
  },
];

for (const h of histories) {
  const snapshots = buildHistory(h.symbol, h.assetId, h.base, h.changes);
  MOCK_PRICE_HISTORY.set(
    h.symbol,
    snapshots.map((s) => ({ price: s.price, timestamp: s.timestamp })),
  );
}

function buildQuote(
  symbol: string,
  assetId: string,
  name: string,
  assetClass: NormalizedMarketQuote["assetClass"],
  providerSymbol: string,
  dailyChangePercent: number,
): NormalizedMarketQuote {
  const history = MOCK_PRICE_HISTORY.get(symbol)!;
  const latest = history[history.length - 1];
  const previousClose = history[0].price;
  const absoluteChange = latest.price - previousClose;

  return {
    assetId,
    symbol,
    providerSymbol,
    name,
    assetClass,
    price: latest.price,
    previousClose,
    absoluteChange,
    percentageChange: dailyChangePercent,
    timestamp: latest.timestamp,
    receivedAt: latest.timestamp,
    processedAt: latest.timestamp,
    marketStatus: "OPEN",
    isRealtime: false,
    dataAvailability: "DEMO",
    source: "development-mock",
    instrumentLabel: `${name} (DEMO)`,
    staleAfterSeconds: 120,
  };
}

export const MOCK_NORMALIZED_QUOTES: NormalizedMarketQuote[] = MARKET_ASSETS.map((asset) => {
  const h = histories.find((x) => x.symbol === asset.symbol)!;
  return buildQuote(
    asset.symbol,
    asset.assetId,
    asset.name,
    asset.assetClass,
    asset.providerSymbol,
    h.dailyChange,
  );
});

export const MOCK_BREAKING_NEWS: NewsEvent[] = [
  {
    id: "news-001",
    timestamp: minutesAgo(3),
    title: "Middle East escalation detected",
    summary:
      "Multiple reports indicate a new geopolitical escalation in the Middle East region with potential impact on energy markets.",
    eventType: "GEOPOLITICAL",
    severity: "CRITICAL",
    sourceVerification: {
      status: "CONFIRMED",
      sourceCount: 3,
      sources: ["Reuters", "Bloomberg", "AP News"],
      lastVerifiedAt: minutesAgo(2),
      hasOfficialSource: false,
    },
    affectedMarkets: [
      { symbol: "BRENT", name: "Brent", changePercent: 2.8 },
      { symbol: "GOLD", name: "Gold", changePercent: 0.6 },
      { symbol: "DAX", name: "DAX Future", changePercent: -0.9 },
    ],
    status: "CONFIRMED",
  },
  {
    id: "news-002",
    timestamp: minutesAgo(18),
    title: "ECB signals cautious stance on rate cuts",
    summary:
      "European Central Bank officials hint at a more cautious approach to further rate reductions amid sticky inflation data.",
    eventType: "ECONOMIC",
    severity: "MEDIUM",
    sourceVerification: {
      status: "MULTIPLE_SOURCES",
      sourceCount: 2,
      sources: ["Financial Times", "ECB Press"],
      lastVerifiedAt: minutesAgo(16),
      hasOfficialSource: true,
    },
    affectedMarkets: [
      { symbol: "EURUSD", name: "EUR/USD", changePercent: 0.35 },
      { symbol: "DAX", name: "DAX", changePercent: -0.4 },
    ],
    status: "CONFIRMED",
  },
];

export const MOCK_TIMELINE: IntelligenceEvent[] = [
  {
    id: "tl-001",
    timestamp: minutesAgo(7),
    title: "Unusual Brent movement detected",
    description: "Price velocity exceeded baseline threshold.",
    category: "detection",
  },
  {
    id: "tl-002",
    timestamp: minutesAgo(6),
    title: "Brent exceeds +1.5% / 10 min threshold",
    description: "Rule brent-up-10m triggered.",
    category: "threshold",
  },
  {
    id: "tl-003",
    timestamp: minutesAgo(5),
    title: "First geopolitical report detected",
    description: "Single-source headline ingested from wire service.",
    category: "news",
  },
  {
    id: "tl-004",
    timestamp: minutesAgo(4),
    title: "Multiple sources detected",
    description: "3 independent sources confirm escalation narrative.",
    category: "verification",
  },
  {
    id: "tl-005",
    timestamp: minutesAgo(3),
    title: "Event classified as HIGH",
    description: "Severity upgraded based on market correlation.",
    category: "classification",
  },
  {
    id: "tl-006",
    timestamp: minutesAgo(2),
    title: "AI market assessment generated",
    description: "Risk-off regime identified with high confidence.",
    category: "ai",
  },
];

export const MOCK_ALERTS: MarketAlert[] = [
  {
    id: "alert-001",
    triggeredAt: minutesAgo(45),
    asset: "Brent Crude Oil",
    symbol: "BRENT",
    alertPrice: 85.15,
    severity: "HIGH",
    eventType: "OIL_MARKET_ANOMALY",
    aiAssessmentCorrect: true,
    performanceSnapshots: [
      { minutesAfter: 5, price: 85.68, changePercent: 0.64 },
      { minutesAfter: 15, price: 86.42, changePercent: 1.54 },
      { minutesAfter: 30, price: 86.95, changePercent: 2.19 },
      { minutesAfter: 60, price: 87.12, changePercent: 2.4 },
    ],
  },
  {
    id: "alert-002",
    triggeredAt: minutesAgo(120),
    asset: "NASDAQ 100",
    symbol: "NDX",
    alertPrice: 20_580.0,
    severity: "HIGH",
    eventType: "DOWNSIDE_ANOMALY",
    aiAssessmentCorrect: true,
    performanceSnapshots: [
      { minutesAfter: 5, price: 20_420.0, changePercent: -0.78 },
      { minutesAfter: 15, price: 20_280.0, changePercent: -1.46 },
      { minutesAfter: 30, price: 20_195.0, changePercent: -1.87 },
      { minutesAfter: 60, price: 20_145.0, changePercent: -2.11 },
    ],
  },
  {
    id: "alert-003",
    triggeredAt: minutesAgo(240),
    asset: "WTI Crude Oil",
    symbol: "WTI",
    alertPrice: 83.0,
    severity: "MEDIUM",
    eventType: "UPSIDE_ANOMALY",
    aiAssessmentCorrect: null,
    performanceSnapshots: [
      { minutesAfter: 5, price: 83.35, changePercent: 0.35 },
      { minutesAfter: 15, price: 84.05, changePercent: 1.22 },
      { minutesAfter: 30, price: 84.52, changePercent: 1.82 },
      { minutesAfter: 60, price: 85.0, changePercent: 2.4 },
    ],
  },
];

/** @deprecated Use MOCK_NORMALIZED_QUOTES */
export const MOCK_QUOTES = MOCK_NORMALIZED_QUOTES;

/** @deprecated Pipeline generates events dynamically */
export const MOCK_MARKET_EVENTS: MarketEvent[] = [];

export const TRACKED_SYMBOLS = MARKET_ASSETS.map((a) => a.symbol);
