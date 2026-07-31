"use client";

import { Activity, Clock3, Globe2, Newspaper, Sparkles } from "lucide-react";
import { OverviewNewsVisual } from "@/components/market-intelligence/overview-news-visual";
import { useMi } from "@/components/i18n/locale-provider";
import { flashTopicLabel } from "@/lib/i18n/news-labels";
import type { FlashNewsTopic } from "@/lib/market-intelligence/config/oil-rss-feeds";
import { formatTime } from "@/lib/market-intelligence/format";
import type { NewsEvent } from "@/lib/types/market";

interface IntelligenceOverviewProps {
  breakingNews?: NewsEvent[];
}

export function IntelligenceOverview({
  breakingNews = [],
}: IntelligenceOverviewProps) {
  const t = useMi();
  const sourceCount = new Set(
    breakingNews.flatMap((event) => event.sourceVerification.sources),
  ).size;
  const highImpactCount = breakingNews.filter(
    (event) => event.severity === "HIGH" || event.severity === "CRITICAL",
  ).length;
  const latestEvent = [...breakingNews].sort(
    (left, right) =>
      new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  )[0];
  const topicCounts = Object.entries(
    breakingNews.reduce<Record<string, number>>((counts, event) => {
      const topic = event.flashTopic ?? "other";
      counts[topic] = (counts[topic] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <header>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">
          {t.oilGeoIntelligence}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          {t.mostImportantFirst}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {t.topStoriesGlance}
        </p>
      </header>

      <section className="terminal-card-glow relative overflow-hidden rounded-[1.6rem] border border-cyan-300/15 bg-gradient-to-br from-[#122131] via-[#101c29] to-orange-500/[0.08] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.2)] sm:p-5">
        <div
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 left-[18%] h-40 w-40 rounded-full bg-orange-400/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-orange-300/20 bg-orange-500/12 text-orange-200 shadow-[0_8px_24px_rgba(249,115,22,0.12)]">
                <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300">
                  {t.liveBriefing}
                </p>
                <h3 className="mt-0.5 text-base font-semibold text-white sm:text-lg">
                  {t.whatMovesNews}
                </h3>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/15 bg-emerald-500/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
              Live
            </span>
          </div>

          <div className="app-horizontal-scroll -mx-1 mt-4 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
            <BriefingMetric
              icon={Newspaper}
              label={t.activeReports}
              value={String(breakingNews.length)}
              detail={t.prioritizedBundled}
              tone="orange"
            />
            <BriefingMetric
              icon={Activity}
              label={t.highImpact}
              value={String(highImpactCount)}
              detail={highImpactCount > 0 ? t.attentionElevated : t.situationCalm}
              tone={highImpactCount > 0 ? "red" : "cyan"}
            />
            <BriefingMetric
              icon={Globe2}
              label={t.sourceCoverage}
              value={String(sourceCount)}
              detail={t.agenciesMedia}
              tone="cyan"
            />
            <BriefingMetric
              icon={Clock3}
              label={t.lastUpdate}
              value={latestEvent ? `${formatTime(latestEvent.timestamp)}` : "—"}
              detail={t.continuousCet}
              tone="violet"
            />
          </div>

          {topicCounts.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-white/8 pt-3">
              <span className="mr-1 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
                {t.nowInFocus}
              </span>
              {topicCounts.map(([topic, count], index) => (
                <span
                  key={topic}
                  className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase ${
                    index === 0
                      ? "border-orange-300/20 bg-orange-500/12 text-orange-200"
                      : "border-white/8 bg-white/[0.04] text-slate-400"
                  }`}
                >
                  {flashTopicLabel(
                    (topic as FlashNewsTopic) || "other",
                    t,
                  )}{" "}
                  {count}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {breakingNews.length > 0 && (
        <OverviewNewsVisual events={breakingNews} />
      )}
    </div>
  );
}

function BriefingMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Newspaper;
  label: string;
  value: string;
  detail: string;
  tone: "orange" | "cyan" | "red" | "violet";
}) {
  const tones = {
    orange: "border-orange-300/15 bg-orange-500/[0.07] text-orange-200",
    cyan: "border-cyan-300/15 bg-cyan-500/[0.06] text-cyan-200",
    red: "border-red-300/15 bg-red-500/[0.07] text-red-200",
    violet: "border-violet-300/15 bg-violet-500/[0.07] text-violet-200",
  } as const;

  return (
    <article
      className={`mobile-native-card min-w-[10rem] flex-1 snap-start rounded-xl border p-3 ${tones[tone]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[8px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
      <p className="mt-2 font-mono text-xl font-bold tabular-nums text-white">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-slate-500">{detail}</p>
    </article>
  );
}
