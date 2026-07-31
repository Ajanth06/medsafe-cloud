"use client";

import { useMemo, useState } from "react";
import { Globe2, Radio, ShieldAlert } from "lucide-react";
import { useMi } from "@/components/i18n/locale-provider";
import { formatTime } from "@/lib/market-intelligence/format";
import { cn } from "@/lib/utils";
import type {
  IntelligenceEventCluster,
  MarketSentiment,
  NewsEvent,
} from "@/lib/types/market";

interface GeopoliticalOilMonitorProps {
  events: IntelligenceEventCluster[];
  breakingNews: NewsEvent[];
}

const FOCUS_DEFS = [
  { id: "all", terms: [] as string[] },
  { id: "iran", terms: ["iran"] },
  { id: "usa", terms: ["usa", "u.s.", "trump", "washington"] },
  { id: "israel", terms: ["israel"] },
  { id: "hormuz", terms: ["hormuz", "strait"] },
  { id: "saudi", terms: ["saudi"] },
  { id: "opec", terms: ["opec"] },
  { id: "russia", terms: ["russia", "russian", "ukraine"] },
  { id: "red-sea", terms: ["red sea", "houthi", "yemen"] },
  { id: "china", terms: ["china", "chinese", "beijing"] },
] as const;

type FocusId = (typeof FOCUS_DEFS)[number]["id"];

type MonitorItem = {
  id: string;
  timestamp: string;
  source: string;
  category: string;
  headline: string;
  summary: string;
  impact: MarketSentiment;
  priority: string;
  text: string;
  url?: string;
};

function resolveImpact(text: string, change: number): MarketSentiment {
  const lower = text.toLowerCase();
  if (
    /disruption|closure|sanction|attack|strike|outage|production cut|threat/.test(
      lower,
    )
  ) {
    return "BULLISH PRESSURE";
  }
  if (/ceasefire|output increase|production increase|inventory build/.test(lower)) {
    return "BEARISH PRESSURE";
  }
  if (change > 0.3) return "BULLISH PRESSURE";
  if (change < -0.3) return "BEARISH PRESSURE";
  return "WATCH";
}

function impactTone(impact: MarketSentiment) {
  if (impact.includes("BULLISH")) return "text-emerald-300 bg-emerald-500/10";
  if (impact.includes("BEARISH")) return "text-red-300 bg-red-500/10";
  return "text-amber-200 bg-amber-500/10";
}

export function GeopoliticalOilMonitor({
  events,
  breakingNews,
}: GeopoliticalOilMonitorProps) {
  const t = useMi();
  const [focus, setFocus] = useState<FocusId>("all");

  const FOCUS = [
    { id: "all" as const, label: t.focusAll, terms: FOCUS_DEFS[0].terms },
    { id: "iran" as const, label: "Iran", terms: FOCUS_DEFS[1].terms },
    { id: "usa" as const, label: t.focusUsaTrump, terms: FOCUS_DEFS[2].terms },
    { id: "israel" as const, label: "Israel", terms: FOCUS_DEFS[3].terms },
    { id: "hormuz" as const, label: "Hormuz", terms: FOCUS_DEFS[4].terms },
    { id: "saudi" as const, label: t.focusSaudi, terms: FOCUS_DEFS[5].terms },
    { id: "opec" as const, label: "OPEC+", terms: FOCUS_DEFS[6].terms },
    { id: "russia" as const, label: t.focusRussia, terms: FOCUS_DEFS[7].terms },
    { id: "red-sea" as const, label: t.focusRedSea, terms: FOCUS_DEFS[8].terms },
    { id: "china" as const, label: "China", terms: FOCUS_DEFS[9].terms },
  ];

  const items = useMemo<MonitorItem[]>(() => {
    const clustered = events.map((event) => {
      const text = `${event.headline} ${event.summary}`;
      const oilAsset = event.aiAnalysisResult?.affectedAssets.find((asset) =>
        /WTI|BRENT|OIL/i.test(asset.asset),
      );
      const change =
        oilAsset?.pressure.includes("BULLISH")
          ? 1
          : oilAsset?.pressure.includes("BEARISH")
            ? -1
            : 0;
      return {
        id: event.id,
        timestamp: event.latestUpdateAt,
        source: event.sources[0]?.sourceName ?? "AARYX Intelligence",
        category: event.eventType.replace(/_/g, " "),
        headline: event.headline,
        summary: event.summary,
        impact: resolveImpact(text, change),
        priority: event.priority,
        text: text.toLowerCase(),
        url: event.sources[0]?.url,
      };
    });
    const knownIds = new Set(clustered.map((item) => item.id));
    const flashes = breakingNews
      .filter((event) => !knownIds.has(event.id))
      .map((event) => {
        const change =
          event.affectedMarkets.find((market) =>
            /WTI|BRENT/.test(market.symbol),
          )?.changePercent ?? 0;
        const text = `${event.title} ${event.summary}`;
        return {
          id: event.id,
          timestamp: event.timestamp,
          source:
            event.sourceVerification.sources[0] ?? "AARYX News Intelligence",
          category: event.flashTopic?.toUpperCase() ?? event.eventType,
          headline: event.title,
          summary: event.summary,
          impact: resolveImpact(text, change),
          priority: event.severity,
          text: text.toLowerCase(),
          url: event.url,
        };
      });
    return [...clustered, ...flashes].sort(
      (left, right) =>
        new Date(right.timestamp).getTime() -
        new Date(left.timestamp).getTime(),
    );
  }, [events, breakingNews]);

  const activeFocus = FOCUS.find((item) => item.id === focus) ?? FOCUS[0];
  const visible =
    focus === "all"
      ? items
      : items.filter((item) =>
          activeFocus.terms.some((term) => item.text.includes(term)),
        );

  return (
    <section className="space-y-3" aria-labelledby="geopolitical-oil-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/10 text-cyan-200">
            <Globe2 className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <div>
            <h2
              id="geopolitical-oil-heading"
              className="text-sm font-semibold uppercase tracking-wider text-white"
            >
              {t.geoMonitorTitle}
            </h2>
            <p className="text-[11px] text-slate-500">
              {t.geoMonitorSubtitle}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-1 font-mono text-[9px] uppercase text-cyan-200">
          <Radio className="h-3 w-3 animate-pulse" aria-hidden="true" />
          {visible.length} {t.activeCount}
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FOCUS.map((item) => {
          const count =
            item.id === "all"
              ? items.length
              : items.filter((entry) =>
                  item.terms.some((term) => entry.text.includes(term)),
                ).length;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFocus(item.id)}
              className={cn(
                "app-touch shrink-0 rounded-lg px-2.5 py-2 font-mono text-[9px] font-semibold uppercase transition",
                focus === item.id
                  ? "bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/30"
                  : "bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]",
              )}
            >
              {item.label} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2.5">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-5 text-sm text-slate-500">
            {t.noFocusReports}
          </div>
        ) : (
          visible.slice(0, 14).map((item) => {
            const content = (
              <>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase">
                  <span className="text-slate-500">{formatTime(item.timestamp)} CET</span>
                  <span className="text-cyan-300">{item.category}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-bold",
                      item.priority === "CRITICAL"
                        ? "bg-red-500/20 text-red-300"
                        : item.priority === "HIGH"
                          ? "bg-orange-500/20 text-orange-200"
                          : "bg-white/[0.06] text-slate-400",
                    )}
                  >
                    {item.priority} {t.impactLabel}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-white">
                  {item.headline}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {item.summary}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500">
                    {t.sourcePrefix} {item.source}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[9px] font-bold uppercase",
                      impactTone(item.impact),
                    )}
                  >
                    <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                    {t.potentialImpact} {item.impact}
                  </span>
                </div>
              </>
            );
            return item.url ? (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-white/8 bg-[#101c29]/90 p-4 transition hover:border-cyan-400/20 hover:bg-[#122131]"
              >
                {content}
              </a>
            ) : (
              <article
                key={item.id}
                className="rounded-xl border border-white/8 bg-[#101c29]/90 p-4"
              >
                {content}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
