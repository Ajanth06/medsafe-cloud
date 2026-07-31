"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import type { AppLocale } from "@/lib/i18n/locales";
import { getMi } from "@/lib/i18n/mi";
import type { NewsEvent } from "@/lib/types/market";

interface FlashPayload {
  breakingNews?: NewsEvent[];
  fetchedAt?: string;
  error?: string;
  locale?: string;
}

const FLASH_POLL_MS = 90_000;

function flashFingerprint(events: NewsEvent[]): string {
  return events
    .map(
      (e) =>
        `${e.id}:${e.isFlash ? 1 : 0}:${e.imageUrl ? 1 : 0}:${e.language ?? ""}:${e.title.slice(0, 40)}`,
    )
    .join("|");
}

function mergeFlashEvents(prev: NewsEvent[], next: NewsEvent[]): NewsEvent[] {
  const imageById = new Map<string, string>();
  const imageByUrl = new Map<string, string>();
  for (const e of prev) {
    if (!e.imageUrl) continue;
    imageById.set(e.id, e.imageUrl);
    if (e.url) imageByUrl.set(e.url, e.imageUrl);
  }

  const seenTitles = new Set<string>();
  const out: NewsEvent[] = [];

  for (const e of next) {
    const imageUrl =
      e.imageUrl ??
      imageById.get(e.id) ??
      (e.url ? imageByUrl.get(e.url) : undefined);
    const titleKey = e.title
      .toLowerCase()
      .replace(/[^a-z0-9äöüß\u0B80-\u0BFF\s]/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    if (titleKey && seenTitles.has(titleKey)) continue;
    if (titleKey) seenTitles.add(titleKey);
    out.push(imageUrl && !e.imageUrl ? { ...e, imageUrl } : e);
  }

  return out;
}

/** Prefer new titles/language, keep previously resolved photos. */
function replaceKeepingImages(prev: NewsEvent[], next: NewsEvent[]): NewsEvent[] {
  const imageById = new Map(
    prev.filter((e) => e.imageUrl).map((e) => [e.id, e.imageUrl!] as const),
  );
  const imageByUrl = new Map(
    prev
      .filter((e) => e.url && e.imageUrl)
      .map((e) => [e.url!, e.imageUrl!] as const),
  );
  return next.map((e) => {
    const imageUrl =
      e.imageUrl ??
      imageById.get(e.id) ??
      (e.url ? imageByUrl.get(e.url) : undefined);
    return imageUrl && !e.imageUrl ? { ...e, imageUrl } : e;
  });
}

/** Rough check: did the feed actually come back in the UI language? */
function roughlyMatchesLocale(events: NewsEvent[], locale: AppLocale): boolean {
  if (!events.length) return false;
  const sample = events.slice(0, 12);
  const langHits = sample.filter((e) => e.language === locale).length;
  if (locale === "ta") {
    return (
      sample.some((e) => /[\u0B80-\u0BFF]/.test(e.title)) ||
      langHits >= Math.max(2, Math.ceil(sample.length * 0.25))
    );
  }
  if (locale === "de") {
    return (
      sample.some((e) => /[äöüßÄÖÜ]/.test(e.title)) ||
      langHits >= Math.max(2, Math.ceil(sample.length * 0.25))
    );
  }
  return langHits >= 1 || sample.some((e) => /^[A-Za-z0-9]/.test(e.title.trim()));
}

/**
 * Keeps Flash News fresh; refetches when UI language changes.
 * Live `?lang=` responses must not be overwritten by SSR props (always DE default).
 */
export function useLiveFlashNews(initialEvents: NewsEvent[]) {
  const { locale } = useLocale();
  const [events, setEvents] = useState(initialEvents);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fingerprintRef = useRef(flashFingerprint(initialEvents));
  const eventsRef = useRef(initialEvents);
  const localeRef = useRef(locale);
  /** Locale for which we already applied a live flash API response. */
  const liveLocaleRef = useRef<AppLocale | null>(null);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    // Once live flash data exists for the active UI language, ignore SSR/
    // dashboard props — those default to DE and would wipe EN/TA headlines.
    if (liveLocaleRef.current === locale) return;

    const next = flashFingerprint(initialEvents);
    if (next !== fingerprintRef.current && initialEvents.length > 0) {
      fingerprintRef.current = next;
      const merged = mergeFlashEvents(eventsRef.current, initialEvents);
      setEvents(merged);
      eventsRef.current = merged;
    }
  }, [initialEvents, locale]);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const localeChanged = localeRef.current !== locale;
    localeRef.current = locale;

    if (localeChanged) {
      liveLocaleRef.current = null;
    }

    async function tick(force = false): Promise<NewsEvent[]> {
      if (cancelled || inFlight) return eventsRef.current;
      inFlight = true;
      try {
        const res = await fetch(
          `/api/market/news/flash?lang=${encodeURIComponent(locale)}`,
          {
            cache: "no-store",
            credentials: "same-origin",
          },
        );
        if (!res.ok) {
          if (!cancelled) {
            setError(res.status === 401 ? null : `HTTP ${res.status}`);
          }
          return eventsRef.current;
        }
        const data = (await res.json()) as FlashPayload;
        if (cancelled) return eventsRef.current;

        const nextEvents = Array.isArray(data.breakingNews)
          ? data.breakingNews
          : [];
        if (nextEvents.length > 0) {
          const applied = force
            ? replaceKeepingImages(eventsRef.current, nextEvents)
            : mergeFlashEvents(eventsRef.current, nextEvents);
          const fp = flashFingerprint(applied);
          if (fp !== fingerprintRef.current || force) {
            fingerprintRef.current = fp;
            eventsRef.current = applied;
            startTransition(() => setEvents(applied));
          }
          liveLocaleRef.current = locale;
        }
        setFetchedAt(data.fetchedAt ?? new Date().toISOString());
        setError(null);
        return nextEvents.length > 0 ? nextEvents : eventsRef.current;
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : getMi(locale).flashFeedDisconnected,
          );
        }
        return eventsRef.current;
      } finally {
        inFlight = false;
      }
    }

    async function tickUntilTranslated() {
      const first = await tick(true);
      if (cancelled) return;
      if (roughlyMatchesLocale(first, locale)) return;

      // First response often still has source-language titles while AI
      // translations finish in the background — retry a few times.
      for (const delay of [2_500, 6_000, 12_000]) {
        await new Promise((r) => setTimeout(r, delay));
        if (cancelled) return;
        const again = await tick(true);
        if (roughlyMatchesLocale(again, locale)) return;
      }
    }

    const needsLocaleFetch =
      localeChanged || !roughlyMatchesLocale(eventsRef.current, locale);

    const t0 = window.setTimeout(
      () => {
        if (needsLocaleFetch) void tickUntilTranslated();
        else void tick(false);
      },
      localeChanged || needsLocaleFetch ? 60 : 400,
    );
    const t1 = window.setTimeout(() => void tick(false), 14_000);
    const interval = window.setInterval(() => void tick(false), FLASH_POLL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearInterval(interval);
    };
  }, [locale]);

  return { events, fetchedAt, error, pollMs: FLASH_POLL_MS };
}
