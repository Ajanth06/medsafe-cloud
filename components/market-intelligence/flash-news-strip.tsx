"use client";

import { useEffect, useMemo, useState } from "react";
import { Radio, Zap } from "lucide-react";
import {
  FLASH_TOPIC_LABELS_DE,
  FLASH_TOPIC_ORDER,
  classifyFlashTopic,
  type FlashNewsTopic,
} from "@/lib/market-intelligence/config/oil-rss-feeds";
import { formatTime } from "@/lib/market-intelligence/format";
import { cn } from "@/lib/utils";
import type { NewsEvent } from "@/lib/types/market";

interface FlashNewsStripProps {
  events: NewsEvent[];
  oilMovePercent?: number;
}

type TopicFilter = "all" | FlashNewsTopic;

function resolveTopic(event: NewsEvent): FlashNewsTopic {
  return (
    event.flashTopic ??
    classifyFlashTopic(`${event.title} ${event.summary}`)
  );
}

function topicRank(topic: FlashNewsTopic): number {
  const i = FLASH_TOPIC_ORDER.indexOf(topic);
  return i === -1 ? 99 : i;
}

/**
 * Flash feed: all current oil/Iran/OPEC news, sorted by topic then time.
 */
export function FlashNewsStrip({
  events,
  oilMovePercent = 0,
}: FlashNewsStripProps) {
  const [now, setNow] = useState(() => Date.now());
  const [topic, setTopic] = useState<TopicFilter>("all");

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const flashItems = useMemo(() => {
    return events
      .filter((e) => {
        if (e.isFlash) return true;
        const age = now - new Date(e.timestamp).getTime();
        return age >= -60_000 && age < 36 * 60 * 60_000;
      })
      .map((e) => ({ ...e, flashTopic: resolveTopic(e) }))
      .sort((a, b) => {
        const tr = topicRank(a.flashTopic) - topicRank(b.flashTopic);
        if (tr !== 0) return tr;
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });
  }, [events, now]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      FLASH_TOPIC_ORDER.map((t) => [t, 0]),
    ) as Record<FlashNewsTopic, number>;
    for (const e of flashItems) {
      map[e.flashTopic] = (map[e.flashTopic] ?? 0) + 1;
    }
    return map;
  }, [flashItems]);

  const visible = useMemo(() => {
    const filtered =
      topic === "all"
        ? flashItems
        : flashItems.filter((e) => e.flashTopic === topic);
    // Cap DOM nodes for smooth mobile scroll
    return filtered.slice(0, 14);
  }, [flashItems, topic]);

  const grouped = useMemo(() => {
    if (topic !== "all") {
      return [{ topic: topic as FlashNewsTopic, items: visible }];
    }
    const groups: { topic: FlashNewsTopic; items: typeof visible }[] = [];
    for (const t of FLASH_TOPIC_ORDER) {
      const items = visible.filter((e) => e.flashTopic === t);
      if (items.length) groups.push({ topic: t, items });
    }
    return groups;
  }, [visible, topic]);

  if (flashItems.length === 0) return null;

  const tabs: { id: TopicFilter; label: string; count: number }[] = [
    { id: "all", label: "Alle", count: flashItems.length },
    ...FLASH_TOPIC_ORDER.filter((t) => counts[t] > 0).map((t) => ({
      id: t as TopicFilter,
      label: FLASH_TOPIC_LABELS_DE[t],
      count: counts[t],
    })),
  ];

  return (
    <section
      className="overflow-hidden rounded-2xl border border-orange-400/30 bg-gradient-to-r from-orange-500/15 via-[#101c29]/95 to-red-500/10"
      aria-label="Flash News nach Thema"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-3 py-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-white shadow-[0_0_12px_rgba(249,115,22,0.55)]">
          <Zap className="h-3 w-3" aria-hidden="true" />
          Flash
        </span>
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-orange-200">
          <Radio className="h-3 w-3 animate-pulse" aria-hidden="true" />
          Alle aktuellen · Öl · Iran · OPEC
        </span>
        <span className="ml-auto font-mono text-[9px] text-slate-500">
          {flashItems.length} Meldungen
        </span>
      </div>

      <div
        className="flex gap-1 overflow-x-auto border-b border-white/6 px-2 py-1.5"
        role="tablist"
        aria-label="Nachrichtenthema"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={topic === tab.id}
            onClick={() => setTopic(tab.id)}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide transition",
              topic === tab.id
                ? "bg-orange-500/25 text-orange-100 ring-1 ring-orange-400/40"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {tab.label}
            <span className="ml-1 opacity-60">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="max-h-[22rem] overflow-y-auto overscroll-contain divide-y divide-white/6 sm:max-h-[28rem]">
        {visible.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-400">
            Keine Meldungen in diesem Thema.
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.topic}>
              {topic === "all" && (
                <div className="sticky top-0 z-[1] border-b border-white/6 bg-[#101c29]/95 px-3 py-1.5 backdrop-blur">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange-200/90">
                    {FLASH_TOPIC_LABELS_DE[group.topic]}
                    <span className="ml-2 font-normal text-slate-500">
                      {group.items.length}
                    </span>
                  </p>
                </div>
              )}
              {group.items.map((event) => {
                const serverHot =
                  event.severity === "HIGH" || event.severity === "CRITICAL";
                const topicHot = event.flashTopic === "iran";
                const marketConfirms = Math.abs(oilMovePercent) >= 0.35;
                const hot =
                  serverHot && (topicHot || marketConfirms || event.flashTopic === "iran");

                return (
                  <a
                    key={event.id}
                    href={event.url ?? "#"}
                    target={event.url ? "_blank" : undefined}
                    rel={event.url ? "noreferrer" : undefined}
                    className={cn(
                      "flex items-start gap-2.5 px-3 py-2.5 transition hover:bg-white/[0.04] sm:gap-3",
                      !event.url && "pointer-events-none",
                    )}
                  >
                    <div className="mt-0.5 flex w-[3.25rem] shrink-0 flex-col gap-1">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-center font-mono text-[8px] font-bold uppercase",
                          hot
                            ? "bg-red-500/20 text-red-300"
                            : "bg-orange-400/15 text-orange-200",
                        )}
                      >
                        {hot ? "HOT" : "NEW"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                        {event.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-400 sm:line-clamp-1">
                        {event.summary}
                      </p>
                      <p className="mt-1 font-mono text-[9px] text-slate-500">
                        {formatTime(event.timestamp)} CET ·{" "}
                        {event.sourceVerification.sources.slice(0, 1).join(", ")}
                        {event.language === "en" ? " · EN" : ""}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
