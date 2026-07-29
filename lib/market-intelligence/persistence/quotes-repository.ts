import { getMiDb } from "@/lib/supabase/mi-db";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { EnrichedMarketQuote } from "@/lib/types/market";

export async function persistLatestQuotes(quotes: EnrichedMarketQuote[]): Promise<void> {
  const supabase = getMiDb();
  if (!supabase) return;

  const rows = quotes
    .filter((q) => q.price > 0)
    .map((q) => ({
      asset_id: q.assetId,
      symbol: q.symbol,
      price: q.price,
      bid: q.bid ?? null,
      ask: q.ask ?? null,
      previous_close: q.previousClose ?? null,
      absolute_change: q.absoluteChange ?? null,
      percentage_change: q.percentageChange ?? null,
      provider_timestamp: q.timestamp,
      received_at: new Date().toISOString(),
      processed_at: new Date().toISOString(),
      is_realtime: q.isRealtime ?? false,
      delay_seconds: q.delaySeconds ?? null,
      market_status: q.marketStatus ?? null,
      data_quality: q.dataAvailability,
      source: q.source ?? null,
      contract_symbol: q.contractSymbol ?? null,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return;

  const { error } = await supabase.from("mi_latest_quotes").upsert(rows, { onConflict: "asset_id" });
  if (error) marketLogger.warn("persist_quotes_failed", { error: error.message });
}

export async function persistPriceHistorySnapshots(
  quotes: EnrichedMarketQuote[],
): Promise<void> {
  const supabase = getMiDb();
  if (!supabase) return;

  const rows = quotes
    .filter((q) => q.price > 0)
    .map((q) => ({
      asset_id: q.assetId,
      symbol: q.symbol,
      price: q.price,
      recorded_at: q.timestamp,
      source: q.source ?? "stream",
    }));

  if (rows.length === 0) return;

  const { error } = await supabase.from("mi_price_history").insert(rows);
  if (error && !error.message.includes("duplicate")) {
    marketLogger.warn("persist_price_history_failed", { error: error.message });
  }
}
