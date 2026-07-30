"use client";

import { useEffect, useMemo, useState } from "react";
import { Radio, Zap } from "lucide-react";
import { formatTime } from "@/lib/market-intelligence/format";
import { cn } from "@/lib/utils";
import type { NewsEvent } from "@/lib/types/market";

interface FlashNewsStripProps {
  events: NewsEvent[];
}

/**
 * Scrolling flash ticker for fresh oil / Iran / OPEC headlines.
 */
export function FlashNewsStrip({ events }: FlashNewsStripProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const flashItems = useMemo(() => {
    return events
      .filter((e) => {
        if (e.isFlash) return true;
        const age = now - new Date(e.timestamp).getTime();
        return age >= 0 && age < 60 * 60_000;
      })
      .slice(0, 8);
  }, [events, now]);

  if (flashItems.length === 0) return null;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-orange-400/30 bg-gradient-to-r from-orange-500/15 via-[#101c29]/95 to-red-500/10"
      aria-label="Flash News Öl & Geopolitik"
    >
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-white shadow-[0_0_12px_rgba(249,115,22,0.55)]">
          <Zap className="h-3 w-3" aria-hidden="true" />
          Flash
        </span>
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-orange-200">
          <Radio className="h-3 w-3 animate-pulse" aria-hidden="true" />
          Oil · Iran · OPEC · Live RSS
        </span>
      </div>

      <div className="divide-y divide-white/6">
        {flashItems.map((event) => {
          const hot = /iran|hormuz|attack|sanctions|opec|missile/i.test(
            `${event.title} ${event.summary}`,
          );
          return (
            <a
              key={event.id}
              href={event.url ?? "#"}
              target={event.url ? "_blank" : undefined}
              rel={event.url ? "noreferrer" : undefined}
              className={cn(
                "flex items-start gap-3 px-3 py-2.5 transition hover:bg-white/[0.04]",
                !event.url && "pointer-events-none",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase",
                  hot
                    ? "bg-red-500/20 text-red-300"
                    : "bg-orange-400/15 text-orange-200",
                )}
              >
                {hot ? "HOT" : "NEW"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {event.title}
                </p>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
                  {event.summary}
                </p>
                <p className="mt-1 font-mono text-[9px] text-slate-500">
                  {formatTime(event.timestamp)} CET ·{" "}
                  {event.sourceVerification.sources.slice(0, 2).join(", ")}
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
