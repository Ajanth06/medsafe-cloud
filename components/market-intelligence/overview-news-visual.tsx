"use client";

import { useMemo, useState } from "react";
import { Flame } from "lucide-react";
import {
  FLASH_TOPIC_LABELS_DE,
  classifyFlashTopic,
  type FlashNewsTopic,
} from "@/lib/market-intelligence/config/oil-rss-feeds";
import { formatTime } from "@/lib/market-intelligence/format";
import { decodeHtmlEntities } from "@/lib/market-intelligence/format/decode-html";
import { cn } from "@/lib/utils";
import type { NewsEvent } from "@/lib/types/market";

interface OverviewNewsVisualProps {
  events: NewsEvent[];
  className?: string;
}

function resolveTopic(event: NewsEvent): FlashNewsTopic {
  return (
    event.flashTopic ??
    classifyFlashTopic(`${event.title} ${event.summary}`)
  );
}

function importanceScore(event: NewsEvent, now: number): number {
  const topic = resolveTopic(event);
  const ageH = (now - new Date(event.timestamp).getTime()) / 3_600_000;
  const text = `${event.title} ${event.summary}`.toLowerCase();
  let score = 0;
  if (event.imageUrl) score += 40;
  if (topic === "iran") score += 28;
  else if (topic === "oil") score += 18;
  else if (topic === "opec") score += 12;
  if (/trump|iran|hormuz|teheran|pentagon|sanktion/.test(text)) score += 22;
  if (event.severity === "CRITICAL") score += 20;
  else if (event.severity === "HIGH") score += 12;
  if (ageH < 6) score += 16;
  else if (ageH < 24) score += 8;
  else if (ageH > 48) score -= 20;
  return score;
}

function NewsPhoto({
  src,
  eager,
  className,
  fallbackClassName,
}: {
  src?: string;
  eager?: boolean;
  className?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={cn("h-full w-full", fallbackClassName)} aria-hidden="true" />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

/**
 * Visual lead strip for Übersicht — photo cards from RSS (Tagesschau etc.)
 * so Trump/Iran/Öl news feel alive, not text-only.
 */
export function OverviewNewsVisual({
  events,
  className,
}: OverviewNewsVisualProps) {
  const items = useMemo(() => {
    const now = Date.now();
    const ranked = events
      .filter((e) => {
        const age = now - new Date(e.timestamp).getTime();
        return age >= -60_000 && age < 48 * 60 * 60_000;
      })
      .map((e) => ({
        ...e,
        flashTopic: resolveTopic(e),
        _score: importanceScore(e, now),
      }))
      .sort((a, b) => b._score - a._score);

    const withImage = ranked.filter((e) => e.imageUrl);
    const without = ranked.filter((e) => !e.imageUrl);
    return [...withImage, ...without].slice(0, 6);
  }, [events]);

  if (items.length === 0) return null;

  const hero = items[0];
  const rest = items.slice(1);

  return (
    <section
      className={cn("space-y-2.5", className)}
      aria-label="Wichtige News mit Bild"
    >
      <div className="flex items-end justify-between gap-2 px-0.5">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-orange-300">
            Live Bild · Iran · AJ · BBC · US
          </p>
          <h3 className="text-base font-semibold text-white sm:text-lg">
            Wichtige Nachrichten
          </h3>
        </div>
        <span className="font-mono text-[9px] text-slate-500">
          {items.filter((i) => i.imageUrl).length} Fotos
        </span>
      </div>

      <a
        href={hero.url ?? "#"}
        target={hero.url ? "_blank" : undefined}
        rel={hero.url ? "noreferrer" : undefined}
        className={cn(
          "group relative block overflow-hidden rounded-2xl border border-orange-400/25 bg-[#0d1722]",
          !hero.url && "pointer-events-none",
        )}
      >
        <div className="relative aspect-[16/10] sm:aspect-[21/9]">
          <NewsPhoto
            src={hero.imageUrl}
            eager
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            fallbackClassName="bg-gradient-to-br from-orange-600/40 via-[#152536] to-cyan-900/40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07111a] via-[#07111a]/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-wider text-white">
                <Flame className="h-2.5 w-2.5" aria-hidden="true" />
                Top
              </span>
              <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-orange-100">
                {FLASH_TOPIC_LABELS_DE[hero.flashTopic]}
              </span>
            </div>
            <p className="line-clamp-2 text-base font-semibold leading-snug text-white sm:text-xl">
              {decodeHtmlEntities(hero.title)}
            </p>
            <p className="mt-1 font-mono text-[9px] text-slate-300/90">
              {formatTime(hero.timestamp)} CET ·{" "}
              {decodeHtmlEntities(
                hero.sourceVerification.sources.slice(0, 1).join(", ") ||
                  "Quelle",
              )}
            </p>
          </div>
        </div>
      </a>

      {rest.length > 0 && (
        <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rest.map((event) => (
            <a
              key={event.id}
              href={event.url ?? "#"}
              target={event.url ? "_blank" : undefined}
              rel={event.url ? "noreferrer" : undefined}
              className={cn(
                "group relative w-[9.5rem] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#101c29] sm:w-[11rem]",
                !event.url && "pointer-events-none",
              )}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <NewsPhoto
                  src={event.imageUrl}
                  className="h-full w-full object-cover transition duration-400 group-hover:scale-105"
                  fallbackClassName={cn(
                    event.flashTopic === "iran"
                      ? "bg-gradient-to-br from-red-700/50 to-[#1a2433]"
                      : event.flashTopic === "oil"
                        ? "bg-gradient-to-br from-orange-700/45 to-[#1a2433]"
                        : "bg-gradient-to-br from-cyan-800/40 to-[#1a2433]",
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1520] via-transparent to-transparent" />
                <span className="absolute left-1.5 top-1.5 rounded bg-black/45 px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-wide text-white/90 backdrop-blur-sm">
                  {FLASH_TOPIC_LABELS_DE[event.flashTopic].split(" ")[0]}
                </span>
              </div>
              <p className="line-clamp-3 px-2 py-2 text-[11px] font-semibold leading-snug text-slate-100">
                {decodeHtmlEntities(event.title)}
              </p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
