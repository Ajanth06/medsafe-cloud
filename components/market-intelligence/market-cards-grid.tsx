import { MarketCard } from "@/components/market-intelligence/market-card";
import { BrentWTISpreadCard } from "@/components/market-intelligence/brent-wti-spread-card";
import { miDe } from "@/lib/market-intelligence/i18n/de";
import type { BrentWTISpread, EnrichedMarketQuote } from "@/lib/types/market";

interface MarketCardsGridProps {
  quotes: EnrichedMarketQuote[];
  primaryQuotes: EnrichedMarketQuote[];
  brentWtiSpread: BrentWTISpread | null;
}

export function MarketCardsGrid({
  quotes: _quotes,
  primaryQuotes,
  brentWtiSpread,
}: MarketCardsGridProps) {
  return (
    <section aria-labelledby="live-markets-heading" className="space-y-5 md:space-y-7">
      <div>
        <h2
          id="live-markets-heading"
          className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400 md:mb-4 md:text-xs md:tracking-[0.18em]"
        >
          {miDe.liveMarketsEnergy}
        </h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {primaryQuotes.map((quote) => (
            <MarketCard key={quote.symbol} quote={quote} featured />
          ))}
          {brentWtiSpread && (
            <BrentWTISpreadCard spread={brentWtiSpread} />
          )}
        </div>
      </div>
    </section>
  );
}
