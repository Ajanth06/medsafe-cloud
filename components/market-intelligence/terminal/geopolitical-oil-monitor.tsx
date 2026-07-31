"use client";

import { useMemo, useState } from "react";
import { Globe2, Radio, ShieldAlert } from "lucide-react";
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

const FOCUS = [
  { id: "all", label: "Alle", terms: [] },
  { id: "iran", label: "Iran", terms: ["iran"] },
  { id: "usa", label: "USA / Trump", terms: ["usa", "u.s.", "trump", "washington"] },
  { id: "israel", label: "Israel", terms: ["israel"] },
  { id: "hormuz", label: "Hormuz", terms: ["hormuz", "strait"] },
  { id: "saudi", label: "Saudi-Arabien", terms: ["saudi"] },
  { id: "opec", label: "OPEC+", terms: ["opec"] },
  { id: "russia", label: "Russland / Ukraine", terms: ["russia", "russian", "ukraine"] },
  { id: "red-sea", label: "Red Sea / Houthis", terms: ["red sea", "houthi", "yemen"] },
  { id: "china", label: "China", terms: ["china", "chinese", "beijing"] },
] as const;

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
  const [focus, setFocus] = useState<(typeof FOCUS)[number]["id"]>("all");
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
              Geopolitical Oil Monitor
            </h2>
            <p className="text-[11px] text-slate-500">
              Ereignisse mit möglicher Relevanz für WTI und Brent
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-2.5 py-1 font-mono text-[9px] uppercase text-cyan-200">
          <Radio className="h-3 w-3 animate-pulse" aria-hidden="true" />
          {visible.length} aktiv
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
            Keine aktuellen Meldungen für diesen Fokus.
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
                    {item.priority} IMPACT
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
                    Quelle: {item.source}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[9px] font-bold uppercase",
                      impactTone(item.impact),
                    )}
                  >
                    <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                    Potential Impact: {item.impact}
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
