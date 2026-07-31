"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { getMi } from "@/lib/i18n/mi";
import type { NewsEvent } from "@/lib/types/market";

interface FlashPayload {
  breakingNews?: NewsEvent[];
  fetchedAt?: string;
  error?: string;
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

/**
 * Keeps Flash News fresh; refetches when UI language changes.
 */
export function useLiveFlashNews(initialEvents: NewsEvent[]) {
  const { locale } = useLocale();
  const [events, setEvents] = useState(initialEvents);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fingerprintRef = useRef(flashFingerprint(initialEvents));
  const eventsRef = useRef(initialEvents);
  const localeRef = useRef(locale);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    const next = flashFingerprint(initialEvents);
    if (next !== fingerprintRef.current && initialEvents.length > 0) {
      fingerprintRef.current = next;
      const merged = mergeFlashEvents(eventsRef.current, initialEvents);
      setEvents(merged);
      eventsRef.current = merged;
    }
  }, [initialEvents]);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;
    const localeChanged = localeRef.current !== locale;
    localeRef.current = locale;

    async function tick(force = false) {
      if (cancelled || inFlight) return;
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
          return;
        }
        const data = (await res.json()) as FlashPayload;
        if (cancelled) return;

        const nextEvents = Array.isArray(data.breakingNews)
          ? data.breakingNews
          : [];
        if (nextEvents.length > 0) {
          const merged = force
            ? nextEvents
            : mergeFlashEvents(eventsRef.current, nextEvents);
          const fp = flashFingerprint(merged);
          if (fp !== fingerprintRef.current || force) {
            fingerprintRef.current = fp;
            eventsRef.current = merged;
            startTransition(() => setEvents(merged));
          }
        }
        setFetchedAt(data.fetchedAt ?? new Date().toISOString());
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : getMi(locale).flashFeedDisconnected,
          );
        }
      } finally {
        inFlight = false;
      }
    }

    const t0 = window.setTimeout(
      () => void tick(localeChanged),
      localeChanged ? 80 : 400,
    );
    const t1 = window.setTimeout(() => void tick(), 14_000);
    const interval = window.setInterval(() => void tick(), FLASH_POLL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearInterval(interval);
    };
  }, [locale]);

  return { events, fetchedAt, error, pollMs: FLASH_POLL_MS };
}
