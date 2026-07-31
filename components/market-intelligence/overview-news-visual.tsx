"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Flame } from "lucide-react";
import {
  classifyFlashTopic,
  type FlashNewsTopic,
} from "@/lib/market-intelligence/config/oil-rss-feeds";
import { resolveAgencyRegion } from "@/components/market-intelligence/news-detail-panel";
import { useMi } from "@/components/i18n/locale-provider";
import {
  agencyRegionLabel,
  flashTopicLabel,
} from "@/lib/i18n/news-labels";
import { formatTime } from "@/lib/market-intelligence/format";
import { decodeHtmlEntities } from "@/lib/market-intelligence/format/decode-html";
import { cn } from "@/lib/utils";
import type { NewsEvent } from "@/lib/types/market";

interface OverviewNewsVisualProps {
  events: NewsEvent[];
  className?: string;
}

type VisualItem = NewsEvent & { flashTopic: FlashNewsTopic };

const INITIAL_VISIBLE = 8;
const MAX_POOL = 48;

/** Neutral placeholder — never loud red/orange blocks. */
const PHOTO_FALLBACK = "bg-[#152536]";

function resolveTopic(event: NewsEvent): FlashNewsTopic {
  return (
    event.flashTopic ??
    classifyFlashTopic(`${event.title} ${event.summary}`)
  );
}

function normalizeTitleKey(title: string): string {
  return decodeHtmlEntities(title)
    .toLowerCase()
    .normalize("NFKD")
    // Keep letters/numbers from any script (DE/EN/Tamil), not only ASCII.
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96);
}

function titleOverlap(a: string, b: string): number {
  const wa = new Set(
    normalizeTitleKey(a)
      .split(" ")
      .filter((w) => w.length > 2),
  );
  const wb = new Set(
    normalizeTitleKey(b)
      .split(" ")
      .filter((w) => w.length > 2),
  );
  if (wa.size === 0 || wb.size === 0) return 0;
  let hit = 0;
  for (const w of wa) if (wb.has(w)) hit += 1;
  return hit / Math.max(wa.size, wb.size);
}

function importanceScore(event: NewsEvent, now: number): number {
  const topic = resolveTopic(event);
  const ageH = (now - new Date(event.timestamp).getTime()) / 3_600_000;
  const text = `${event.title} ${event.summary}`.toLowerCase();
  let score = 0;
  if (event.imageUrl) score += 50;
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

function sharpenImageUrl(raw?: string): string | undefined {
  if (!raw) return undefined;
  let url = raw;

  url = url.replace(
    /\/(16x9|4x3)-(?:small|medium|tiny|S|M)\//gi,
    "/$1-big/",
  );
  url = url.replace(
    /(ichef\.bbci\.co\.uk\/(?:news|ace\/(?:standard|ws))\/)(\d{2,4})\//gi,
    (_m, prefix: string, size: string) => {
      const n = Number.parseInt(size, 10);
      const better = !Number.isFinite(n) || n < 800 ? 976 : n;
      return `${prefix}${better}/`;
    },
  );

  try {
    const parsed = new URL(url);
    if (/images\.tagesschau\.de$/i.test(parsed.hostname)) {
      parsed.searchParams.set("width", "960");
      return parsed.toString();
    }
  } catch {
    /* keep */
  }
  return url;
}

/** Only real photos, deduped by id / image / near-identical title. */
function buildPhotoPool(
  events: NewsEvent[],
  previous: VisualItem[],
): VisualItem[] {
  const now = Date.now();
  const scored = events
    .filter((e) => {
      if (!e.imageUrl) return false;
      const age = now - new Date(e.timestamp).getTime();
      return age >= -60_000 && age < 48 * 60 * 60_000;
    })
    .map((e) => ({
      ...e,
      imageUrl: sharpenImageUrl(e.imageUrl) ?? e.imageUrl,
      flashTopic: resolveTopic(e),
      _score: importanceScore(e, now),
    }))
    .sort((a, b) => b._score - a._score);

  const byId = new Map(previous.map((e) => [e.id, e]));
  for (const e of scored) {
    const prev = byId.get(e.id);
    byId.set(e.id, {
      ...e,
      imageUrl: e.imageUrl ?? prev?.imageUrl,
    });
  }

  const candidates: VisualItem[] = [];
  const seenIds = new Set<string>();
  for (const e of scored) {
    if (candidates.length >= MAX_POOL) break;
    const item = byId.get(e.id) ?? e;
    if (!item.imageUrl || seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    candidates.push(item);
  }
  for (const e of previous) {
    if (candidates.length >= MAX_POOL) break;
    if (!e.imageUrl || seenIds.has(e.id)) continue;
    const age = now - new Date(e.timestamp).getTime();
    if (age > 48 * 60 * 60_000) continue;
    seenIds.add(e.id);
    candidates.push({
      ...e,
      imageUrl: sharpenImageUrl(e.imageUrl) ?? e.imageUrl,
    });
  }

  // Collapse near-duplicates (same story from DE + EN / same photo)
  const unique: VisualItem[] = [];
  const seenImages = new Set<string>();
  for (const item of candidates) {
    const imgKey = (item.imageUrl ?? "").split("?")[0].toLowerCase();
    if (imgKey && seenImages.has(imgKey)) continue;

    const titleKey = normalizeTitleKey(item.title);
    // Empty/very short keys (e.g. failed strip) must NOT collapse the whole pool.
    const dup =
      titleKey.length >= 8 &&
      unique.some((u) => {
        const otherKey = normalizeTitleKey(u.title);
        if (otherKey.length < 8) return false;
        return (
          otherKey === titleKey || titleOverlap(u.title, item.title) >= 0.72
        );
      });
    if (dup) continue;

    if (imgKey) seenImages.add(imgKey);
    unique.push(item);
  }

  if (unique.length === 0 && previous.length > 0) {
    return previous.filter((e) => e.imageUrl);
  }
  return unique;
}

function NewsPhoto({
  src,
  eager,
  className,
}: {
  src: string;
  eager?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [mode, setMode] = useState<0 | 1>(0);
  const sharpSrc = sharpenImageUrl(src) ?? src;
  const displaySrc =
    mode === 0
      ? sharpSrc
      : `/api/market/news/image?u=${encodeURIComponent(sharpSrc)}`;

  useEffect(() => {
    const reset = window.setTimeout(() => {
      setFailed(false);
      setMode(0);
    }, 0);
    return () => window.clearTimeout(reset);
  }, [sharpSrc]);

  if (failed) {
    return <div className={cn("h-full w-full", PHOTO_FALLBACK)} aria-hidden="true" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={displaySrc}
      src={displaySrc}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      sizes={
        eager
          ? "(max-width: 768px) 100vw, 1100px"
          : "(max-width: 768px) 42vw, 220px"
      }
      onError={() => {
        if (mode === 0) {
          setMode(1);
          return;
        }
        setFailed(true);
      }}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

/**
 * Hero above · photo grid below · source link stays at bottom.
 * Only real photos (no red placeholders). Mehr / Weniger toggle.
 */
export function OverviewNewsVisual({
  events,
  className,
}: OverviewNewsVisualProps) {
  const t = useMi();
  const [items, setItems] = useState<VisualItem[]>([]);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const prevRef = useRef<VisualItem[]>([]);
  const sectionRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const next = buildPhotoPool(events, prevRef.current);
    const prevFp = prevRef.current.map((e) => `${e.id}:${e.imageUrl ?? ""}`).join("|");
    const nextFp = next.map((e) => `${e.id}:${e.imageUrl ?? ""}`).join("|");
    if (prevFp === nextFp) {
      if (
        prevRef.current.length === next.length &&
        prevRef.current.every((e, i) => e.id === next[i]?.id)
      ) {
        const textChanged = prevRef.current.some(
          (e, i) => e.title !== next[i]?.title || e.summary !== next[i]?.summary,
        );
        if (textChanged) {
          prevRef.current = next;
          setItems(next);
        }
        return;
      }
    }
    prevRef.current = next;
    setItems(next);
  }, [events]);

  const activeFeaturedId =
    featuredId && items.some((event) => event.id === featuredId)
      ? featuredId
      : null;

  const ordered = useMemo(() => {
    if (!activeFeaturedId) return items;
    const featured = items.find((e) => e.id === activeFeaturedId);
    if (!featured) return items;
    return [featured, ...items.filter((e) => e.id !== activeFeaturedId)];
  }, [items, activeFeaturedId]);

  if (ordered.length === 0) return null;

  const hero = ordered[0];
  const gridVisible = expanded
    ? ordered
    : ordered.slice(0, INITIAL_VISIBLE);
  const canExpand = ordered.length > INITIAL_VISIBLE;
  const sourceName = decodeHtmlEntities(
    hero.sourceVerification.sources.slice(0, 1).join(", ") || t.unknownSource,
  );
  const region = resolveAgencyRegion(hero);
  const sourceUrl = hero.url;

  function selectStory(id: string) {
    setFeaturedId(id);
    requestAnimationFrame(() => {
      heroRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function toggleExpand() {
    if (expanded) {
      setExpanded(false);
      requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      return;
    }
    setExpanded(true);
  }

  return (
    <section
      ref={sectionRef}
      className={cn("space-y-2.5", className)}
      aria-label={t.importantNewsAria}
    >
      <div className="flex items-end justify-between gap-2 px-0.5">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-orange-300">
            {t.liveImageBadge}
          </p>
          <h3 className="text-base font-semibold text-white sm:text-lg">
            {t.importantNews}
          </h3>
        </div>
        <span className="font-mono text-[9px] text-slate-500">
          {ordered.length} {t.photos}
        </span>
      </div>

      <div className="grid items-stretch gap-2.5 md:grid-cols-5">
        <article
          ref={heroRef}
          className="relative overflow-hidden rounded-2xl border border-orange-400/25 bg-[#0d1722] md:col-span-3"
        >
          <div className="relative aspect-[4/3] h-full min-h-[13rem] bg-[#0d1722] sm:aspect-[21/9] md:aspect-auto md:min-h-[15rem]">
            {hero.imageUrl ? (
              <NewsPhoto
                src={hero.imageUrl}
                eager
                className="h-full w-full scale-[1.01] object-cover"
              />
            ) : (
              <div className={cn("h-full w-full", PHOTO_FALLBACK)} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#07111a]/95 via-[#07111a]/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2 py-0.5 font-mono text-[8px] font-black uppercase tracking-wider text-white">
                  <Flame className="h-2.5 w-2.5" aria-hidden="true" />
                  Top
                </span>
                <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-orange-100">
                  {flashTopicLabel(hero.flashTopic, t)}
                </span>
              </div>
              <p className="line-clamp-2 text-base font-semibold leading-snug text-white sm:text-xl">
                {decodeHtmlEntities(hero.title)}
              </p>
              <p className="mt-1 font-mono text-[9px] text-slate-300/90">
                {formatTime(hero.timestamp)} CET
              </p>
            </div>
          </div>
        </article>

        <aside className="mobile-native-card flex flex-col gap-2.5 rounded-2xl border border-white/10 bg-[#101c29]/95 p-3 sm:gap-3 sm:p-4 md:col-span-2">
          <div className="min-h-0 flex-1">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-orange-300">
              {t.reportDetails}
            </p>
            <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-slate-300 sm:mt-2 sm:line-clamp-5 sm:text-sm lg:line-clamp-none">
              {decodeHtmlEntities(hero.summary)}
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-2.5 sm:p-3">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {t.agencyRegion}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{sourceName}</p>
            <p className="mt-0.5 text-xs text-slate-400">{agencyRegionLabel(region, t)}</p>
            <p className="mt-1.5 font-mono text-[10px] text-slate-500 sm:mt-2">
              {formatTime(hero.timestamp)} CET
            </p>
          </div>
          {sourceUrl ? (
            <a
              href={sourceUrl}
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
        </aside>
      </div>

      {gridVisible.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {gridVisible.map((event) => {
            const active = event.id === hero.id;
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => selectStory(event.id)}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-[#101c29] text-left transition",
                  active
                    ? "border-orange-400/50 ring-1 ring-orange-400/40"
                    : "border-white/10 hover:border-orange-400/35",
                )}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[#152536]">
                  {event.imageUrl && (
                    <NewsPhoto
                      src={event.imageUrl}
                      className="h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b1520]/70 via-transparent to-transparent" />
                  <span className="absolute left-1.5 top-1.5 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[7px] font-bold uppercase tracking-wide text-white/90">
                    {flashTopicLabel(event.flashTopic, t).split(" ")[0]}
                  </span>
                </div>
                <p className="line-clamp-3 px-2 py-2 text-[11px] font-semibold leading-snug text-slate-100">
                  {decodeHtmlEntities(event.title)}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {canExpand && (
        <button
          type="button"
          onClick={toggleExpand}
          aria-expanded={expanded}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-200 transition hover:border-orange-400/30 hover:bg-orange-500/10 hover:text-orange-100"
        >
          {expanded ? (
            <>
              {t.showLess}
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          ) : (
            <>
              {t.showMore}
              <span className="text-slate-500">
                +{ordered.length - INITIAL_VISIBLE}
              </span>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </>
          )}
        </button>
      )}

    </section>
  );
}
