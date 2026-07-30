"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ChevronDown,
  Clock3,
  Newspaper,
  Sparkles,
} from "lucide-react";
import { formatChange } from "@/lib/market-intelligence/format";
import { cn } from "@/lib/utils";
import type {
  EnrichedMarketQuote,
  IntelligenceEventCluster,
  NewsEvent,
} from "@/lib/types/market";

interface MorningBriefingProps {
  quotes: EnrichedMarketQuote[];
  breakingNews: NewsEvent[];
  intelligenceEvents: IntelligenceEventCluster[];
  unreadAlertCount: number;
}

export function MorningBriefing({
  quotes,
  breakingNews,
  intelligenceEvents,
  unreadAlertCount,
}: MorningBriefingProps) {
  const [expanded, setExpanded] = useState(false);
  const strongestMove = useMemo(
    () =>
      quotes
        .filter((quote) => quote.price > 0)
        .sort(
          (left, right) =>
            Math.abs(right.percentageChange) - Math.abs(left.percentageChange),
        )[0],
    [quotes],
  );
  const oilQuotes = quotes.filter(
    (quote) => quote.symbol === "WTI" || quote.symbol === "BRENT",
  );
  const oilVolatile = oilQuotes.some(
    (quote) =>
      Math.abs(quote.percentageChange) >= 1 ||
      quote.volatilityStatus !== "NORMAL",
  );
  const leadStory =
    intelligenceEvents[0]?.headline ??
    breakingNews[0]?.title ??
    "Aktuell liegt keine priorisierte Nachricht vor.";

  return (
    <section className="terminal-card-glow relative overflow-hidden rounded-[1.25rem] border border-cyan-300/15 bg-gradient-to-br from-[#122131]/95 via-[#101c29]/95 to-orange-400/[0.06] p-3.5 shadow-[0_16px_44px_rgba(0,0,0,0.18)] md:rounded-[1.6rem] md:p-5">
      <div className="pointer-events-none absolute -left-12 -top-14 h-36 w-36 rounded-full bg-orange-400/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-2 md:gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
              <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-200">
                AARYX Briefing
              </p>
              <h2 className="mt-1 text-base font-semibold tracking-tight text-white md:text-lg">
                Dein Markt in 30 Sekunden
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-white/10 bg-white/[0.05] px-2.5 py-2 text-[11px] font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white md:px-3 md:text-xs"
            aria-expanded={expanded}
          >
            Warum?
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                expanded && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="app-scroll -mx-1 mt-4 grid snap-x snap-mandatory grid-flow-col auto-cols-[86%] gap-2.5 overflow-x-auto px-1 pb-1 md:mx-0 md:mt-5 md:grid-flow-row md:auto-cols-auto md:grid-cols-3 md:gap-3 md:overflow-visible md:px-0 md:pb-0">
          <div className="snap-start rounded-xl border border-white/8 bg-white/[0.04] p-3 md:rounded-2xl md:p-3.5">
            <Activity className="h-4 w-4 text-orange-300" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-200">
              {strongestMove
                ? `${strongestMove.name} führt die Bewegung mit ${formatChange(
                    strongestMove.percentageChange,
                    true,
                  )}.`
                : "Die beobachteten Märkte zeigen derzeit keine klare Führung."}
            </p>
          </div>
          <div className="snap-start rounded-xl border border-white/8 bg-white/[0.04] p-3 md:rounded-2xl md:p-3.5">
            <Clock3 className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-200">
              {oilVolatile
                ? "WTI oder Brent zeigen erhöhte Bewegung und bleiben im Fokus."
                : "WTI und Brent bewegen sich aktuell in einem ruhigeren Regime."}
            </p>
          </div>
          <div className="snap-start rounded-xl border border-white/8 bg-white/[0.04] p-3 md:rounded-2xl md:p-3.5">
            <Newspaper className="h-4 w-4 text-orange-300" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-200">
              {breakingNews.length + intelligenceEvents.length} relevante Meldungen
              {unreadAlertCount > 0
                ? ` · ${unreadAlertCount} ungelesene Alerts.`
                : " · keine ungelesenen Alerts."}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300",
            expanded
              ? "mt-4 grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="rounded-2xl border border-orange-300/15 bg-orange-400/[0.06] p-4">
              <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-orange-200">
                Führende Nachricht
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                {leadStory}
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                Grundlage: aktuelle Marktbewegungen, priorisierte Meldungen und
                AARYX-Alertstatus. Keine Anlageberatung.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
