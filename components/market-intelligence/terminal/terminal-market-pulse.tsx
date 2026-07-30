"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, Globe2, TrendingDown, TrendingUp } from "lucide-react";
import { formatChange, formatPrice } from "@/lib/market-intelligence/format";
import { cn } from "@/lib/utils";
import type { EnrichedMarketQuote } from "@/lib/types/market";

const MARKET_CLOCKS = [
  { city: "Berlin", zone: "Europe/Berlin" },
  { city: "New York", zone: "America/New_York" },
  { city: "Tokio", zone: "Asia/Tokyo" },
  { city: "Shanghai", zone: "Asia/Shanghai" },
] as const;

function MarketClock({
  city,
  zone,
  now,
  className,
}: {
  city: string;
  zone: string;
  now: number | null;
  className?: string;
}) {
  const time = now
    ? new Intl.DateTimeFormat("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: zone,
      }).format(now)
    : "--:--:--";

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg border border-white/8 bg-white/[0.04] px-2 py-1.5 md:rounded-xl md:px-2.5",
        className,
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
        {city}
      </span>
      <span className="font-mono text-[10px] font-semibold tabular-nums text-cyan-200">
        {time}
      </span>
    </div>
  );
}

function TickerItems({
  quotes,
  hidden = false,
}: {
  quotes: EnrichedMarketQuote[];
  hidden?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-7 pr-7" aria-hidden={hidden || undefined}>
      {quotes.map((quote) => {
        const positive = quote.percentageChange > 0;
        const negative = quote.percentageChange < 0;

        return (
          <div key={quote.symbol} className="flex shrink-0 items-center gap-2 font-mono text-[10px]">
            <span className="font-bold text-slate-200">{quote.symbol}</span>
            <span className="tabular-nums text-white">
              {formatPrice(quote.price, quote.symbol)}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 tabular-nums",
                positive && "text-emerald-300",
                negative && "text-red-300",
                !positive && !negative && "text-slate-400",
              )}
            >
              {positive && <TrendingUp className="h-3 w-3" aria-hidden="true" />}
              {negative && <TrendingDown className="h-3 w-3" aria-hidden="true" />}
              {formatChange(quote.percentageChange, true)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function TerminalMarketPulse({ quotes }: { quotes: EnrichedMarketQuote[] }) {
  const [now, setNow] = useState<number | null>(null);
  const tickerQuotes = useMemo(
    () => quotes.filter((quote) => quote.price > 0).slice(0, 8),
    [quotes],
  );

  useEffect(() => {
    const update = () => setNow(Date.now());
    const initialUpdate = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1000);

    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  if (tickerQuotes.length === 0) return null;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#07111a]/55"
      aria-label="Globale Marktzeiten und laufende Kurse"
    >
      <div className="app-scroll flex items-center gap-1.5 overflow-x-auto px-2 py-1.5 md:gap-2 md:px-2.5 md:py-2">
        <span className="flex shrink-0 items-center gap-1.5 px-1 text-[9px] font-bold uppercase tracking-[0.18em] text-orange-300">
          <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
          Weltzeit
        </span>
        {MARKET_CLOCKS.map((clock, index) => (
          <MarketClock
            key={clock.city}
            {...clock}
            now={now}
            className={index > 1 ? "hidden md:flex" : undefined}
          />
        ))}
      </div>

      <div className="relative flex items-center border-t border-white/8 py-1.5 md:py-2">
        <span className="z-10 ml-2 flex shrink-0 items-center gap-1.5 rounded-lg bg-orange-400/10 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.14em] text-orange-200 md:ml-2.5 md:text-[9px] md:tracking-[0.16em]">
          <Clock3 className="h-3 w-3" aria-hidden="true" />
          Markt-Puls
        </span>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#07111a] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#07111a] to-transparent" />
          <div className="market-ticker-track flex w-max items-center pl-7 hover:[animation-play-state:paused]">
            <TickerItems quotes={tickerQuotes} />
            <TickerItems quotes={tickerQuotes} hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
