"use client";

import { useEffect, useMemo, useState } from "react";
import { Crosshair, Radio } from "lucide-react";
import {
  buildIranUsBoard,
  type IranUsHeadline,
} from "@/lib/market-intelligence/services/iran-us-headline";
import { cn } from "@/lib/utils";
import type { NewsEvent } from "@/lib/types/market";

interface IranUsHeaderProps {
  events: NewsEvent[];
}

function HeadlineRow({ item }: { item: IranUsHeadline }) {
  const className =
    "block border-b border-white/6 px-3 py-2.5 transition last:border-0 hover:bg-white/[0.04]";
  const body = (
    <>
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
        {item.title}
      </p>
      {item.summary ? (
        <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">
          {item.summary}
        </p>
      ) : null}
      <p className="mt-1 font-mono text-[9px] text-slate-500">
        {item.ageLabel} · {item.source}
      </p>
    </>
  );

  if (item.url) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {body}
      </a>
    );
  }
  return <div className={className}>{body}</div>;
}

function SideColumn({
  title,
  accent,
  items,
  empty,
}: {
  title: string;
  accent: "blue" | "red";
  items: IranUsHeadline[];
  empty: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border",
        accent === "blue"
          ? "border-sky-400/25 bg-sky-500/5"
          : "border-red-400/25 bg-red-500/5",
      )}
    >
      <div
        className={cn(
          "border-b px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-wider",
          accent === "blue"
            ? "border-sky-400/20 text-sky-200"
            : "border-red-400/20 text-red-200",
        )}
      >
        {title}
        <span className="ml-2 font-normal opacity-60">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-3 py-3 text-xs text-slate-500">{empty}</p>
      ) : (
        <div className="max-h-52 overflow-y-auto overscroll-contain sm:max-h-72">
          {items.map((item) => (
            <HeadlineRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Live board: Trump/USA statements vs Iran statements — all current matching news.
 */
export function IranUsHeader({ events }: IranUsHeaderProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const board = useMemo(() => {
    void now;
    return buildIranUsBoard(events, 8);
  }, [events, now]);

  const total = board.trump.length + board.iran.length;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-red-400/35 bg-gradient-to-r from-red-600/15 via-[#1a1018] to-sky-500/10 shadow-[0_0_28px_rgba(239,68,68,0.1)]"
      aria-label="Trump und Iran Nachrichten"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-3 py-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-red-500 px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-white shadow-[0_0_12px_rgba(239,68,68,0.45)]">
          <Crosshair className="h-3 w-3" aria-hidden="true" />
          Trump · Iran
        </span>
        <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-red-200">
          <Radio className="h-3 w-3 animate-pulse" aria-hidden="true" />
          Was Trump sagt · Was Iran sagt
        </span>
        <span className="ml-auto font-mono text-[9px] text-slate-500">
          {total} Meldungen
        </span>
      </div>

      {board.latest && (
        <div className="border-b border-white/8 bg-black/20 px-3 py-2">
          <p className="font-mono text-[9px] uppercase tracking-wider text-orange-200/80">
            Zuletzt ·{" "}
            {board.latest.side === "trump"
              ? "Trump/USA"
              : board.latest.side === "iran"
                ? "Iran"
                : "Beide"}{" "}
            · {board.latest.ageLabel}
          </p>
          {board.latest.url ? (
            <a
              href={board.latest.url}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 block text-sm font-semibold text-white hover:underline"
            >
              {board.latest.title}
            </a>
          ) : (
            <p className="mt-0.5 text-sm font-semibold text-white">
              {board.latest.title}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-2 p-2 sm:grid-cols-2">
        <SideColumn
          title="Trump / USA sagt"
          accent="blue"
          items={board.trump}
          empty="Noch keine Trump/USA-Meldung zu Iran."
        />
        <SideColumn
          title="Iran sagt"
          accent="red"
          items={board.iran}
          empty="Noch keine Iran-Reaktion / Aussage."
        />
      </div>
    </section>
  );
}
