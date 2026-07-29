import { getMiDb } from "@/lib/supabase/mi-db";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { MarketEvent } from "@/lib/types/market";

export async function persistMarketEvents(events: MarketEvent[]): Promise<void> {
  const supabase = getMiDb();
  if (!supabase || events.length === 0) return;

  const rows = events.map((e) => ({
    external_id: e.id,
    asset_id: e.assetId,
    symbol: e.symbol,
    direction: e.direction,
    percentage_change: e.percentageChange,
    window_minutes: e.windowMinutes,
    start_price: e.startPrice,
    current_price: e.currentPrice,
    severity: e.severity,
    event_type: e.eventType,
    status: e.status,
    description: e.description,
    detected_at: e.detectedAt,
  }));

  const { error } = await supabase.from("mi_market_events").upsert(rows, { onConflict: "external_id" });
  if (error) marketLogger.warn("persist_market_events_failed", { error: error.message });
}
