"use client";

import { useEffect, useRef, useState } from "react";
import { DataAvailabilityBadge } from "@/components/market-intelligence/data-availability-badge";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Sparkline } from "@/components/market-intelligence/sparkline";
import { Card, CardContent } from "@/components/ui/card";
import { formatChange, formatPrice, formatTime } from "@/lib/market-intelligence/format";
import { miDe, tDelayedMinutes, tVolatility } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";
import type { EnrichedMarketQuote } from "@/lib/types/market";

interface MarketCardProps {
  quote: EnrichedMarketQuote;
  featured?: boolean;
}

function AnimatedPrice({ value, symbol }: { value: number; symbol: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const startValue = previousValue.current;
    previousValue.current = value;

    if (startValue === value) return;

    const duration = 280;
    const startedAt = performance.now();
    let animationFrame = 0;

    const animate = (time: number) => {
      const progress = Math.min((time - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + (value - startValue) * eased);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value]);

  return <>{formatPrice(displayValue, symbol)}</>;
}

function WindowChange({ label, value }: { label: string; value?: number }) {
  if (value === undefined) return null;
  const positive = value > 0;
  const negative = value < 0;

  return (
    <div className="text-center">
      <p className="text-[9px] uppercase tracking-wider text-muted">{label}</p>
      <p
        className={cn(
          "font-mono text-xs font-semibold",
          positive && "text-emerald-600",
          negative && "text-red-600",
          !positive && !negative && "text-muted",
        )}
      >
        {formatChange(value, true)}
      </p>
    </div>
  );
}

export function MarketCard({
  quote,
  featured = false,
}: MarketCardProps) {
  const unavailable = quote.dataAvailability === "UNAVAILABLE" || quote.price <= 0;
  const positive = quote.direction === "up";
  const negative = quote.direction === "down";

  return (
    <Card
      className={cn(
        "terminal-card-glow group relative overflow-hidden border-white/10 bg-[#101c29]/90 shadow-[0_8px_30px_rgba(0,0,0,0.16)] backdrop-blur transition-all duration-300 hover:-translate-y-1.5 hover:rotate-[0.15deg] hover:border-cyan-300/20 hover:shadow-[0_18px_45px_rgba(0,0,0,0.24)]",
        featured && "border-orange-400/40 ring-1 ring-orange-400/20",
        unavailable && "opacity-80",
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-0.5 opacity-80",
          featured
            ? "bg-gradient-to-r from-orange-500 via-orange-400 to-cyan-500"
            : "bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent",
        )}
      />
      <CardContent className="space-y-2.5 p-3 md:space-y-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{quote.name}</p>
            <p className="truncate text-[11px] text-muted">
              {quote.instrumentLabel ?? quote.symbol}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <DataAvailabilityBadge availability={quote.dataAvailability} />
            {quote.volatilityStatus !== "NORMAL" && !unavailable && (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase",
                  quote.volatilityStatus === "HIGH_VOLATILITY"
                    ? "bg-orange-50 text-orange-700"
                    : "bg-yellow-50 text-yellow-700",
                )}
              >
                {tVolatility(quote.volatilityStatus)}
              </span>
            )}
          </div>
        </div>

        {unavailable ? (
          <div className="rounded-xl bg-background/60 p-4 text-center">
            <p className="text-sm font-semibold text-muted">{miDe.dataUnavailable}</p>
            <p className="mt-1 text-xs text-muted">
              {miDe.configureApiKey}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="font-mono text-lg font-semibold tracking-tight text-foreground md:text-xl">
                  <AnimatedPrice value={quote.price} symbol={quote.symbol} />
                </p>
                <div
                  className={cn(
                    "mt-0.5 flex items-center gap-1 text-sm font-medium",
                    positive && "text-emerald-600",
                    negative && "text-red-600",
                    !positive && !negative && "text-muted",
                  )}
                >
                  {positive && <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />}
                  {negative && <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />}
                  {!positive && !negative && <Minus className="h-3.5 w-3.5" aria-hidden="true" />}
                  <span>{miDe.day} {formatChange(quote.percentageChange, true)}</span>
                </div>
              </div>
              {(quote.sparkline?.length ?? 0) >= 2 && (
                <Sparkline data={quote.sparkline} positive={positive} />
              )}
            </div>

            <div className="hidden grid-cols-3 gap-2 rounded-xl bg-background/60 p-2 md:grid">
              <WindowChange label="5M" value={quote.returns.m5} />
              <WindowChange label="15M" value={quote.returns.m15} />
              <WindowChange label="1H" value={quote.returns.m60} />
            </div>
          </>
        )}

        <p className="hidden text-[10px] text-muted md:block">
          {quote.isStale ? `${miDe.stale} ` : `${miDe.updated} `}
          {formatTime(quote.timestamp)} CET
          {quote.delaySeconds && quote.delaySeconds >= 60
            ? ` · ${tDelayedMinutes(Math.round(quote.delaySeconds / 60))}`
            : ""}
          {quote.latency?.providerToServerMs != null &&
            quote.latency.providerToServerMs > 0 &&
            quote.latency.providerToServerMs < 60_000 &&
            ` · ${quote.latency.providerToServerMs}ms`}
        </p>
      </CardContent>
    </Card>
  );
}
