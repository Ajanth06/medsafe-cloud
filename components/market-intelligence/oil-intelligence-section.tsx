"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatChange } from "@/lib/market-intelligence/format";
import { useMi } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type {
  BrentWTISpread,
  EnrichedMarketQuote,
  OilCorrelationResult,
} from "@/lib/types/market";

interface OilIntelligenceSectionProps {
  wti: EnrichedMarketQuote | undefined;
  brent: EnrichedMarketQuote | undefined;
  spread: BrentWTISpread | null;
  oilCorrelation: OilCorrelationResult | null;
}

function MomentumRow({ label, value }: { label: string; value?: number }) {
  if (value === undefined) return null;
  const positive = value > 0;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span
        className={cn(
          "font-mono font-semibold",
          positive ? "text-emerald-600" : value < 0 ? "text-red-600" : "text-muted",
        )}
      >
        {formatChange(value, true)}
      </span>
    </div>
  );
}

export function OilIntelligenceSection({
  wti,
  brent,
  spread,
  oilCorrelation,
}: OilIntelligenceSectionProps) {
  const t = useMi();

  if (!wti && !brent) return null;

  return (
    <section aria-labelledby="oil-intelligence-heading">
      <h2
        id="oil-intelligence-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted"
      >
        {t.oilIntelligence}
      </h2>
      <Card className="border-white/10 bg-[#101c29]/90 text-slate-100">
        <CardContent className="grid gap-6 p-5 lg:grid-cols-3">
          {wti && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {t.wtiMomentum}
              </p>
              <MomentumRow label="5M" value={wti.returns.m5} />
              <MomentumRow label="15M" value={wti.returns.m15} />
              <MomentumRow label="1H" value={wti.returns.m60} />
              <p className="text-[10px] text-slate-500">{wti.instrumentLabel}</p>
            </div>
          )}

          {brent && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {t.brentMomentum}
              </p>
              <MomentumRow label="5M" value={brent.returns.m5} />
              <MomentumRow label="15M" value={brent.returns.m15} />
              <MomentumRow label="1H" value={brent.returns.m60} />
              <p className="text-[10px] text-slate-500">{brent.instrumentLabel}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {t.correlationStatus}
            </p>
            {oilCorrelation ? (
              <>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    oilCorrelation.bothConfirmed ? "text-emerald-400" : "text-slate-300",
                  )}
                >
                  {oilCorrelation.bothConfirmed
                    ? t.oilConfirmed
                    : t.independentMovement}
                </p>
                <p className="text-xs text-slate-400">{oilCorrelation.description}</p>
                {spread && (
                  <p className="font-mono text-sm">
                    {t.spread}: ${spread.spread.toFixed(2)}{" "}
                    <span className="text-slate-400">
                      ({formatChange(spread.spreadChangePercent, true)})
                    </span>
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400">{t.awaitingOilCorrelation}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
