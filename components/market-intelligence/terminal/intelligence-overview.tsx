"use client";

import Link from "next/link";
import { ArrowRight, Brain, Droplets } from "lucide-react";
import { OverviewNewsVisual } from "@/components/market-intelligence/overview-news-visual";
import { PriceChart } from "@/components/market-intelligence/price-chart";
import { formatChange, formatPrice } from "@/lib/market-intelligence/format";
import { tConfidence, tRegime } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";
import type {
  EnrichedMarketQuote,
  IntelligenceEventCluster,
  NewsEvent,
} from "@/lib/types/market";

interface IntelligenceOverviewProps {
  wti?: EnrichedMarketQuote;
  brent?: EnrichedMarketQuote;
  intelligenceEvents: IntelligenceEventCluster[];
  breakingNews?: NewsEvent[];
}

export function IntelligenceOverview({
  wti,
  brent,
  intelligenceEvents,
  breakingNews = [],
}: IntelligenceOverviewProps) {
  const latestAi = [...intelligenceEvents]
    .filter((event) => event.aiAnalysisResult)
    .sort(
      (left, right) =>
        new Date(right.latestUpdateAt).getTime() -
        new Date(left.latestUpdateAt).getTime(),
    )[0];

  return (
    <div className="space-y-5">
      <header>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">
          Oil & Geopolitical Intelligence
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          Wichtigstes zuerst
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Bilder und Schlagzeilen zu Trump, Iran und Öl — plus Kurse und KI.
        </p>
      </header>

      {breakingNews.length > 0 && (
        <OverviewNewsVisual events={breakingNews} />
      )}

      <section className="grid gap-3 lg:grid-cols-2" aria-label="Ölpreise">
        {[wti, brent].map((quote, index) => (
          <article
            key={quote?.symbol ?? index}
            className="overflow-hidden rounded-2xl border border-white/10 bg-[#101c29]/95 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Droplets
                    className="h-4 w-4 text-orange-300"
                    aria-hidden="true"
                  />
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {quote?.symbol ?? (index === 0 ? "WTI" : "BRENT")}
                  </p>
                </div>
                <p className="mt-2 font-mono text-3xl font-semibold text-white">
                  {quote && quote.price > 0
                    ? formatPrice(quote.price, quote.symbol)
                    : "—"}
                </p>
              </div>
              {quote && (
                <span
                  className={cn(
                    "rounded-lg px-2.5 py-1 font-mono text-xs font-bold",
                    quote.percentageChange >= 0
                      ? "bg-emerald-500/12 text-emerald-300"
                      : "bg-red-500/12 text-red-300",
                  )}
                >
                  {formatChange(quote.percentageChange, true)}
                </span>
              )}
            </div>
            {quote && (
              <div className="mt-4">
                <PriceChart
                  data={quote.sparkline}
                  positive={quote.percentageChange >= 0}
                  height={82}
                  label={`${quote.symbol} Intraday`}
                />
              </div>
            )}
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-[#101c29] to-[#0f1a26] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-violet-200">
              <Brain className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-violet-200">
                Neueste KI-Einschätzung
              </p>
              <h3 className="mt-0.5 text-base font-semibold text-white">
                {latestAi?.headline ?? "Keine aktuelle Live-KI-Analyse"}
              </h3>
            </div>
          </div>
          {latestAi?.aiAnalysisResult && (
            <div className="flex gap-2">
              <span className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-[9px] uppercase text-slate-300">
                {tRegime(latestAi.aiAnalysisResult.marketRegime)}
              </span>
              <span className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-[9px] uppercase text-slate-300">
                {tConfidence(latestAi.aiAnalysisResult.confidence)}
              </span>
            </div>
          )}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          {latestAi?.aiAnalysisResult?.summary ??
            "Sobald eine verifizierte Analyse vorliegt, erscheint hier die aktuelle Einordnung von Nachrichten, Ölbewegung und geopolitischem Risiko."}
        </p>
        <Link
          href="/market-intelligence?view=oil&oilView=ai"
          className="app-touch mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-500/10 px-3 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/20"
        >
          Vollständige KI Intelligence
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
