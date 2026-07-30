"use client";

import { PriceChart } from "@/components/market-intelligence/price-chart";
import { formatChange, formatPrice } from "@/lib/market-intelligence/format";
import { miDe } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";
import type {
  BrentWTISpread,
  EnrichedMarketQuote,
  OilCorrelationResult,
} from "@/lib/types/market";

interface OilTerminalViewProps {
  wti: EnrichedMarketQuote | undefined;
  brent: EnrichedMarketQuote | undefined;
  spread: BrentWTISpread | null;
  oilCorrelation: OilCorrelationResult | null;
}

export function OilTerminalView({ wti, brent, spread, oilCorrelation }: OilTerminalViewProps) {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-foreground">{miDe.oilTerminal}</h2>
        <p className="text-sm text-muted">
          {miDe.oilTerminalSub}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {wti && <OilAssetPanel quote={wti} />}
        {brent && <OilAssetPanel quote={brent} />}
      </div>

      {spread && (
        <div className="rounded-2xl border border-white/10 bg-[#101c29]/90 p-5 text-slate-100">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {miDe.brentWtiSpread}
          </p>
          <p className="mt-2 font-mono text-3xl font-semibold">${spread.spread.toFixed(2)}</p>
          <p className={cn("mt-1 text-sm", spread.spreadChangePercent >= 0 ? "text-emerald-400" : "text-red-400")}>
            {formatChange(spread.spreadChangePercent, true)} {miDe.vsPrior}
          </p>
        </div>
      )}

      {oilCorrelation && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
            {miDe.correlationEngine}
          </p>
          <p className={cn("mt-2 text-sm font-semibold", oilCorrelation.bothConfirmed ? "text-emerald-700" : "text-foreground")}>
            {oilCorrelation.bothConfirmed ? miDe.oilConfirmed : miDe.independentMove}
          </p>
          <p className="mt-1 text-xs text-muted">{oilCorrelation.description}</p>
        </div>
      )}
    </div>
  );
}

function OilAssetPanel({ quote }: { quote: EnrichedMarketQuote }) {
  const positive = quote.direction === "up";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101c29]/90 p-5 text-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {quote.symbol}
          </p>
          <p className="text-sm text-slate-300">{quote.name}</p>
        </div>
        <p className="font-mono text-2xl font-semibold">{formatPrice(quote.price, quote.symbol)}</p>
      </div>

      <p className={cn("mt-1 text-sm font-medium", positive ? "text-emerald-400" : "text-red-400")}>
        {miDe.day} {formatChange(quote.percentageChange, true)}
      </p>

      <div className="mt-4">
        <PriceChart
          data={quote.sparkline}
          positive={positive}
          height={140}
          label={miDe.priceAction60m}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <MomentumCell label="5M" value={quote.returns.m5} />
        <MomentumCell label="15M" value={quote.returns.m15} />
        <MomentumCell label="1H" value={quote.returns.m60} />
      </div>

      <p className="mt-3 text-[10px] text-slate-500">{quote.instrumentLabel}</p>
    </div>
  );
}

function MomentumCell({ label, value }: { label: string; value?: number }) {
  if (value === undefined) return null;
  const positive = value > 0;
  return (
    <div className="rounded-lg bg-white/[0.06] p-2">
      <p className="text-slate-500">{label}</p>
      <p className={cn("font-mono font-semibold", positive ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-slate-400")}>
        {formatChange(value, true)}
      </p>
    </div>
  );
}
