import { getAIProviderConfig } from "@/lib/market-intelligence/config/ai-config";
import { getNewsProviderConfig } from "@/lib/market-intelligence/config/news-provider-config";
import { getMarketProviderConfig } from "@/lib/market-intelligence/config/provider-config";
import { createMarketDataProvider } from "@/lib/market-intelligence/providers/provider-factory";
import { createNewsProvider } from "@/lib/market-intelligence/providers/news/news-provider-factory";
import type {
  EngineStatus,
  FeedConnectionState,
  ProviderHealthStatus,
  SystemHealth,
} from "@/lib/types/market";

interface StreamHealthInput {
  lastPollAt: string | null;
  lastError: string | null;
  websocketState: FeedConnectionState;
  isDemo: boolean;
  quotes?: { symbol: string; dataAvailability: string; latency?: { providerToServerMs: number | null } }[];
}

export async function buildSystemHealth(
  stream?: StreamHealthInput,
): Promise<SystemHealth> {
  const config = getMarketProviderConfig();
  const provider = createMarketDataProvider();
  const health = await provider.getHealth();

  const wtiHealth = await checkSymbolFeed("WTI");
  const brentHealth = await checkSymbolFeed("BRENT");
  const goldHealth = await checkSymbolFeed("GOLD");

  const perAssetLatency: Record<string, number | null> = {};
  for (const q of stream?.quotes ?? []) {
    perAssetLatency[q.symbol] = q.latency?.providerToServerMs ?? null;
  }

  const latencies = Object.values(perAssetLatency).filter(
    (v): v is number => v !== null,
  );
  const averageLatencyMs =
    latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : health.latencyMs ?? null;

  const newsConfig = getNewsProviderConfig();
  let newsEngineStatus: EngineStatus = "NOT_CONFIGURED";
  if (newsConfig.isConfigured) {
    newsEngineStatus = "ACTIVE";
  } else {
    try {
      const newsProvider = createNewsProvider();
      const newsHealth = await newsProvider.getProviderHealth();
      newsEngineStatus = newsHealth.status === "ONLINE" ? "READY" : "NOT_CONFIGURED";
    } catch {
      newsEngineStatus = "NOT_CONFIGURED";
    }
  }

  return {
    marketData: config.isConfigured ? health.status : "OFFLINE",
    wtiFeed: wtiHealth,
    brentFeed: brentHealth,
    goldFeed: goldHealth,
    newsEngine: newsEngineStatus,
    aiEngine: getAIProviderConfig().isConfigured ? "READY" : ("NOT_CONFIGURED" as EngineStatus),
    eventDetection: "ACTIVE" as EngineStatus,
    websocket: stream?.websocketState ?? "NOT_CONFIGURED",
    restFallback: config.isConfigured ? "READY" : ("NOT_CONFIGURED" as EngineStatus),
    lastMarketUpdate: stream?.lastPollAt ?? health.lastUpdate,
    lastHeartbeat: stream?.lastPollAt ?? null,
    averageLatencyMs,
    dataSource: config.isConfigured ? provider.name : "Development Demo Provider",
    isLive: config.isConfigured && !stream?.isDemo,
    providerConfigured: config.isConfigured,
    perAssetLatency,
  };
}

async function checkSymbolFeed(symbol: string): Promise<ProviderHealthStatus> {
  try {
    const provider = createMarketDataProvider();
    const quote = await provider.getQuote(symbol);
    if (!quote || quote.dataAvailability === "UNAVAILABLE") return "OFFLINE";
    if (quote.dataAvailability === "STALE") return "STALE";
    if (quote.dataAvailability === "DEMO") return "DEGRADED";
    if (quote.dataAvailability === "DELAYED") return "DEGRADED";
    return "ONLINE";
  } catch {
    return "OFFLINE";
  }
}
