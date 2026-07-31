"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, X } from "lucide-react";
import { classifyFlashTopic } from "@/lib/market-intelligence/config/oil-rss-feeds";
import { formatTime } from "@/lib/market-intelligence/format";
import { decodeHtmlEntities } from "@/lib/market-intelligence/format/decode-html";
import { useMi } from "@/components/i18n/locale-provider";
import {
  agencyRegionLabel,
  flashTopicLabel,
  type NewsAgencyRegion,
} from "@/lib/i18n/news-labels";
import type { NewsEvent } from "@/lib/types/market";

export type { NewsAgencyRegion };

export function resolveAgencyRegion(event: NewsEvent): NewsAgencyRegion {
  const source = decodeHtmlEntities(
    event.sourceVerification?.sources?.[0] ?? "",
  ).toLowerCase();
  const url = (event.url ?? "").toLowerCase();
  const blob = `${source} ${url}`;

  if (/press tv|tehran times|\birna\b|farsnews|mehr news|presstv\.ir|irna\.ir/.test(blob)) {
    return "iranisch";
  }
  if (/al jazeera|aljazeera/.test(blob)) {
    return "international";
  }
  if (
    /cnn|ap news|associated press|nytimes|new york times|washington post|wsj|wall street|fox news|bloomberg|cnbc|google news us/.test(
      blob,
    )
  ) {
    return "amerikanisch";
  }
  if (/bbc|reuters|the guardian|financial times|\.uk\b/.test(blob)) {
    return "britisch";
  }
  if (
    /tagesschau|spiegel|faz|zeit|sueddeutsche|reuters de|google news de|\.de\b|afp|france|le monde/.test(
      blob,
    )
  ) {
    return "europäisch";
  }
  if (/google news| · google/.test(blob)) {
    return "international";
  }
  return "international";
}

interface NewsDetailPanelProps {
  event: NewsEvent;
  onClose: () => void;
}

export function NewsDetailPanel({ event, onClose }: NewsDetailPanelProps) {
  const t = useMi();
  const topic =
    event.flashTopic ??
    classifyFlashTopic(`${event.title} ${event.summary}`);
  const sourceName = decodeHtmlEntities(
    event.sourceVerification?.sources?.[0] ?? t.unknownSource,
  );
  const region = resolveAgencyRegion(event);
  const url = event.url;
  const imageSrc = event.imageUrl
    ? event.imageUrl.replace(
        /(ichef\.bbci\.co\.uk\/(?:news|ace\/(?:standard|ws))\/)(\d{2,4})\//gi,
        (_m, prefix: string, size: string) => {
          const n = Number.parseInt(size, 10);
          const better = !Number.isFinite(n) || n < 800 ? 976 : n;
          return `${prefix}${better}/`;
        },
      )
    : undefined;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] isolate flex items-end justify-center overflow-hidden bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-detail-title"
      onClick={onClose}
    >
      <div
        className="ios-bottom-sheet relative z-[1] max-h-[calc(100dvh-max(0.5rem,env(safe-area-inset-top)))] w-full max-w-lg overscroll-contain overflow-y-auto rounded-t-[1.75rem] border border-white/15 bg-[#0f1a26] shadow-[0_28px_100px_rgba(0,0,0,0.75)] sm:max-h-[85dvh] sm:rounded-2xl sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="app-touch absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-[#08131e]/85 text-slate-200 shadow-lg backdrop-blur-xl transition hover:bg-white/15 hover:text-white"
          aria-label={t.close}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {imageSrc && (
          <div className="relative aspect-[16/9] overflow-hidden bg-[#0d1722]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1a26]/80 via-transparent to-transparent" />
          </div>
        )}

        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 pr-10 sm:pr-9">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-orange-300">
                {flashTopicLabel(topic, t)}
                {event.language === "en" ? ` · ${t.originalEn}` : ""}
              </p>
              <h2
                id="news-detail-title"
                className="mt-1 text-lg font-semibold leading-snug text-white"
              >
                {decodeHtmlEntities(event.title)}
              </h2>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-slate-300">
            {decodeHtmlEntities(event.summary)}
          </p>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {t.agencyRegion}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{sourceName}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {agencyRegionLabel(region, t)}
            </p>
            <p className="mt-2 font-mono text-[10px] text-slate-500">
              {formatTime(event.timestamp)} CET
            </p>
          </div>

          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="app-touch inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-500/10 px-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
            >
              {t.openSource}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : (
            <p className="text-center text-xs text-slate-500">
              {t.noExternalSource}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
