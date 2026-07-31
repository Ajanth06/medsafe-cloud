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
    title: "Eskalation im Nahen Osten erkannt",
    summary:
      "Mehrere Berichte deuten auf eine neue geopolitische Eskalation im Nahen Osten mit möglichem Einfluss auf Energiemärkte hin.",
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
      { symbol: "WTI", name: "WTI", changePercent: 2.5 },
    ],
    status: "CONFIRMED",
  },
  {
    id: "news-002",
    timestamp: minutesAgo(18),
    title: "EZB signalisiert vorsichtige Haltung bei Zinssenkungen",
    summary:
      "Vertreter der Europäischen Zentralbank deuten eine vorsichtigere Haltung bei weiteren Zinssenkungen angesichts hartnäckiger Inflationsdaten an.",
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
      { symbol: "WTI", name: "WTI", changePercent: 0.4 },
      { symbol: "BRENT", name: "Brent", changePercent: 0.35 },
    ],
    status: "CONFIRMED",
  },
];

export const MOCK_TIMELINE: IntelligenceEvent[] = [
  {
    id: "tl-001",
    timestamp: minutesAgo(7),
    title: "Ungewöhnliche Brent-Bewegung erkannt",
    description: "Preisgeschwindigkeit überschritt Basisschwelle.",
    category: "detection",
  },
  {
    id: "tl-002",
    timestamp: minutesAgo(6),
    title: "Brent überschreitet +1,5 % / 10 Min.",
    description: "Regel brent-up-10m ausgelöst.",
    category: "threshold",
  },
  {
    id: "tl-003",
    timestamp: minutesAgo(5),
    title: "Erster geopolitischer Bericht erkannt",
    description: "Einzelquellen-Schlagzeile von Nachrichtenagentur erfasst.",
    category: "news",
  },
  {
    id: "tl-004",
    timestamp: minutesAgo(4),
    title: "Mehrere Quellen erkannt",
    description: "3 unabhängige Quellen bestätigen Eskalations-Narrativ.",
    category: "verification",
  },
  {
    id: "tl-005",
    timestamp: minutesAgo(3),
    title: "Ereignis als HOCH eingestuft",
    description: "Schweregrad aufgrund Marktkorrelation erhöht.",
    category: "classification",
  },
  {
    id: "tl-006",
    timestamp: minutesAgo(2),
    title: "KI-Markteinschätzung erstellt",
    description: "Risikoaversion mit hoher Konfidenz identifiziert.",
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
    asset: "WTI Crude Oil",
    symbol: "WTI",
    alertPrice: 83.4,
    severity: "HIGH",
    eventType: "DOWNSIDE_ANOMALY",
    aiAssessmentCorrect: true,
    performanceSnapshots: [
      { minutesAfter: 5, price: 83.1, changePercent: -0.36 },
      { minutesAfter: 15, price: 82.6, changePercent: -0.96 },
      { minutesAfter: 30, price: 82.2, changePercent: -1.44 },
      { minutesAfter: 60, price: 81.9, changePercent: -1.8 },
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
