import { getAIProviderConfig } from "@/lib/market-intelligence/config/ai-config";
import { getNewsProviderConfig } from "@/lib/market-intelligence/config/news-provider-config";
import { getMarketProviderConfig } from "@/lib/market-intelligence/config/provider-config";
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
  quotes?: {
    symbol: string;
    dataAvailability: string;
    latency?: { providerToServerMs: number | null };
  }[];
}

function feedFromQuotes(
  stream: StreamHealthInput | undefined,
  symbol: string,
): ProviderHealthStatus {
  const quote = stream?.quotes?.find((q) => q.symbol === symbol);
  if (!quote) return stream?.lastPollAt ? "STALE" : "OFFLINE";
  if (quote.dataAvailability === "UNAVAILABLE") return "OFFLINE";
  if (quote.dataAvailability === "STALE") return "STALE";
  if (quote.dataAvailability === "DEMO") return "DEGRADED";
  if (quote.dataAvailability === "DELAYED") return "DEGRADED";
  return "ONLINE";
}

/**
 * Fast health snapshot from stream state — no extra Yahoo/RSS round-trips.
 */
export async function buildSystemHealth(
  stream?: StreamHealthInput,
): Promise<SystemHealth> {
  const config = getMarketProviderConfig();
  const newsConfig = getNewsProviderConfig();

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
      : null;

  const anyLive = (stream?.quotes ?? []).some(
    (q) => q.dataAvailability === "LIVE" || q.dataAvailability === "DELAYED",
  );

  return {
    marketData: config.isConfigured
      ? stream?.isDemo
        ? "DEGRADED"
        : anyLive
          ? "ONLINE"
          : "STALE"
      : "OFFLINE",
    wtiFeed: feedFromQuotes(stream, "WTI"),
    brentFeed: feedFromQuotes(stream, "BRENT"),
    newsEngine: newsConfig.isConfigured ? "ACTIVE" : "READY",
    aiEngine: getAIProviderConfig().isConfigured
      ? "READY"
      : ("NOT_CONFIGURED" as EngineStatus),
    eventDetection: "ACTIVE" as EngineStatus,
    websocket: stream?.websocketState ?? "NOT_CONFIGURED",
    restFallback: config.isConfigured ? "READY" : ("NOT_CONFIGURED" as EngineStatus),
    lastMarketUpdate: stream?.lastPollAt ?? null,
    lastHeartbeat: stream?.lastPollAt ?? null,
    averageLatencyMs,
    dataSource: config.isConfigured
      ? "Yahoo Finance (WTI/Brent)"
      : "Development Demo Provider",
    isLive: config.isConfigured && !stream?.isDemo,
    providerConfigured: config.isConfigured,
    perAssetLatency,
  };
}
