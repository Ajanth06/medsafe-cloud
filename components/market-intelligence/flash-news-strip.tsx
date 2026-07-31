"use client";

import { useEffect, useMemo, useState } from "react";
import { Radio, Zap } from "lucide-react";
import {
  FLASH_TOPIC_ORDER,
  classifyFlashTopic,
  type FlashNewsTopic,
} from "@/lib/market-intelligence/config/oil-rss-feeds";
import { useMi } from "@/components/i18n/locale-provider";
import { flashTopicLabel } from "@/lib/i18n/news-labels";
import { NewsDetailPanel } from "@/components/market-intelligence/news-detail-panel";
import { formatTime } from "@/lib/market-intelligence/format";
import { decodeHtmlEntities } from "@/lib/market-intelligence/format/decode-html";
import { cn } from "@/lib/utils";
import type { NewsEvent } from "@/lib/types/market";

interface FlashNewsStripProps {
  events: NewsEvent[];
  oilMovePercent?: number;
  /** Limit to these topics (e.g. oil + iran for Öl-View) */
  allowedTopics?: FlashNewsTopic[];
  heading?: string;
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
 * Click opens detail; source link only inside the detail panel.
 */
export function FlashNewsStrip({
  events,
  oilMovePercent = 0,
  allowedTopics,
  heading,
}: FlashNewsStripProps) {
  const t = useMi();
  const resolvedHeading = heading ?? t.flashHeadingDefault;
  const [now, setNow] = useState(() => Date.now());
  const [topic, setTopic] = useState<TopicFilter>("all");
  const [selected, setSelected] = useState<NewsEvent | null>(null);

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
      .filter((e) =>
        allowedTopics?.length
          ? allowedTopics.includes(e.flashTopic)
          : true,
      )
      .sort((a, b) => {
        const tr = topicRank(a.flashTopic) - topicRank(b.flashTopic);
        if (tr !== 0) return tr;
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });
  }, [events, now, allowedTopics]);

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      FLASH_TOPIC_ORDER.map((topicId) => [topicId, 0]),
    ) as Record<FlashNewsTopic, number>;
    for (const e of flashItems) {
      map[e.flashTopic] = (map[e.flashTopic] ?? 0) + 1;
    }
    return map;
  }, [flashItems]);

  const topicOrder = useMemo(
    () =>
      allowedTopics?.length
        ? FLASH_TOPIC_ORDER.filter((topicId) => allowedTopics.includes(topicId))
        : FLASH_TOPIC_ORDER,
    [allowedTopics],
  );

  const visible = useMemo(() => {
    const filtered =
      topic === "all"
        ? flashItems
        : flashItems.filter((e) => e.flashTopic === topic);
    return filtered.slice(0, 14);
  }, [flashItems, topic]);

  const grouped = useMemo(() => {
    if (topic !== "all") {
      return [{ topic: topic as FlashNewsTopic, items: visible }];
    }
    const groups: { topic: FlashNewsTopic; items: typeof visible }[] = [];
    for (const topicId of topicOrder) {
      const items = visible.filter((e) => e.flashTopic === topicId);
      if (items.length) groups.push({ topic: topicId, items });
    }
    return groups;
  }, [visible, topic, topicOrder]);

  if (flashItems.length === 0) return null;

  const tabs: { id: TopicFilter; label: string; count: number }[] = [
    { id: "all", label: t.flashAll, count: flashItems.length },
    ...topicOrder.filter((topicId) => counts[topicId] > 0).map((topicId) => ({
      id: topicId as TopicFilter,
      label: flashTopicLabel(topicId, t),
      count: counts[topicId],
    })),
  ];

  return (
    <>
      <section
        className="overflow-hidden rounded-2xl border border-orange-400/30 bg-gradient-to-r from-orange-500/15 via-[#101c29]/95 to-red-500/10"
        aria-label={t.flashByTopicAria}
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-3 py-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-white shadow-[0_0_12px_rgba(249,115,22,0.55)]">
            <Zap className="h-3 w-3" aria-hidden="true" />
            Flash
          </span>
          <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-orange-200">
            <Radio className="h-3 w-3 animate-pulse" aria-hidden="true" />
            {resolvedHeading}
          </span>
          <span className="ml-auto font-mono text-[9px] text-slate-500">
            {flashItems.length} {t.flashReports}
          </span>
        </div>

        <div
          className="flex gap-1 overflow-x-auto border-b border-white/6 px-2 py-1.5"
          role="tablist"
          aria-label={t.newsTopicAria}
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
              {t.flashNoTopic}
            </p>
          ) : (
            grouped.map((group) => (
              <div key={group.topic}>
                {topic === "all" && (
                  <div className="sticky top-0 z-[1] border-b border-white/6 bg-[#101c29]/95 px-3 py-1.5 backdrop-blur">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange-200/90">
                      {flashTopicLabel(group.topic, t)}
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
                    serverHot &&
                    (topicHot || marketConfirms || event.flashTopic === "iran");

                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelected(event)}
                      className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-white/[0.04] sm:gap-3"
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
                          {decodeHtmlEntities(event.title)}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-400 sm:line-clamp-1">
                          {decodeHtmlEntities(event.summary)}
                        </p>
                        <p className="mt-1 font-mono text-[9px] text-slate-500">
                          {formatTime(event.timestamp)} CET ·{" "}
                          {decodeHtmlEntities(
                            event.sourceVerification.sources.slice(0, 1).join(", "),
                          )}
                          {event.language === "en" ? ` · ${t.originalEn}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </section>

      {selected && (
        <NewsDetailPanel
          event={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
