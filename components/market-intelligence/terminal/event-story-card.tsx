"use client";

import { useMemo } from "react";
import { ArrowRightLeft, Flame, Newspaper } from "lucide-react";
import { useMi } from "@/components/i18n/locale-provider";
import { flashTopicLabel } from "@/lib/i18n/news-labels";
import { formatChange, formatPrice } from "@/lib/market-intelligence/format";
import { buildEventStory } from "@/lib/market-intelligence/services/event-story";
import { cn } from "@/lib/utils";
import type {
  EnrichedMarketQuote,
  IntelligenceEventCluster,
  MarketEvent,
  NewsEvent,
} from "@/lib/types/market";

interface EventStoryCardProps {
  quotes: EnrichedMarketQuote[];
  breakingNews: NewsEvent[];
  marketEvents: MarketEvent[];
  intelligenceEvents: IntelligenceEventCluster[];
}

/**
 * One screen story: oil move + matching news + lead/lag.
 */
export function EventStoryCard({
  quotes,
  breakingNews,
  marketEvents,
  intelligenceEvents,
}: EventStoryCardProps) {
  const t = useMi();
  const story = useMemo(
    () =>
      buildEventStory({
        quotes,
        breakingNews,
        marketEvents,
        intelligenceEvents,
      }),
    [quotes, breakingNews, marketEvents, intelligenceEvents],
  );

  if (!story) return null;

  const up = story.oilChangePercent >= 0;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-[#0f1a26] via-[#122033] to-orange-500/10 p-3.5 md:p-5"
      aria-label="Event Story Öl und News"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/20 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-cyan-100">
          <Flame className="h-3 w-3" aria-hidden="true" />
          Event Story
        </span>
        <span className="rounded-md bg-white/8 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase text-slate-300">
          {flashTopicLabel(story.flashTopic, t)}
        </span>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 font-mono text-[9px] font-bold uppercase",
            story.leader === "NEWS"
              ? "bg-orange-500/20 text-orange-200"
              : story.leader === "MARKET"
                ? "bg-emerald-500/20 text-emerald-200"
                : "bg-white/10 text-slate-300",
          )}
        >
          {story.leader === "NEWS"
            ? "News zuerst"
            : story.leader === "MARKET"
              ? "Markt zuerst"
              : "Gleichzeitig"}
        </span>
      </div>

      <p className="mt-3 text-sm font-semibold leading-snug text-white md:text-base">
        {story.oneLiner}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
        <div
          className={cn(
            "rounded-xl border px-3 py-2.5",
            up
              ? "border-emerald-400/25 bg-emerald-500/10"
              : "border-red-400/25 bg-red-500/10",
          )}
        >
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
            {story.oilSymbol}
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-white">
            {formatPrice(story.oilPrice, story.oilSymbol)}
          </p>
          <p
            className={cn(
              "mt-0.5 font-mono text-sm font-semibold",
              up ? "text-emerald-300" : "text-red-300",
            )}
          >
            {formatChange(story.oilChangePercent, true)}
          </p>
        </div>

        {story.newsUrl ? (
          <a
            href={story.newsUrl}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5 transition hover:bg-white/[0.07]"
          >
            <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              <Newspaper className="h-3 w-3" aria-hidden="true" />
              Passende Meldung
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">
              {story.newsTitle}
            </p>
            {story.newsSummary ? (
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                {story.newsSummary}
              </p>
            ) : null}
          </a>
        ) : (
          <div className="min-w-0 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2.5">
            <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-slate-400">
              <Newspaper className="h-3 w-3" aria-hidden="true" />
              Passende Meldung
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">
              {story.newsTitle}
            </p>
            {story.newsSummary ? (
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                {story.newsSummary}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg bg-black/20 px-3 py-2 text-xs text-slate-300">
        <ArrowRightLeft
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300"
          aria-hidden="true"
        />
        <span>{story.leadLagLabel}</span>
      </div>

      {(story.cause || story.risk || story.aiSummary) && (
        <div className="mt-3 space-y-1.5 border-t border-white/8 pt-3 text-xs text-slate-300">
          {story.aiSummary && (
            <p>
              <span className="font-semibold text-slate-200">KI: </span>
              {story.aiSummary}
            </p>
          )}
          {story.cause && (
            <p>
              <span className="font-semibold text-slate-200">Ursache: </span>
              {story.cause}
            </p>
          )}
          {story.risk && (
            <p>
              <span className="font-semibold text-slate-200">Risiko: </span>
              {story.risk}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
