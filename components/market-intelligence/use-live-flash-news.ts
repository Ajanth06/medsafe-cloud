"use client";

import { useEffect, useRef, useState } from "react";
import type { NewsEvent } from "@/lib/types/market";

interface FlashPayload {
  breakingNews?: NewsEvent[];
  fetchedAt?: string;
  error?: string;
}

/** Flash poll — RSS cache is ~90s; keep UI snappy on mobile. */
const FLASH_POLL_MS = 75_000;

function flashFingerprint(events: NewsEvent[]): string {
  return events.map((e) => `${e.id}:${e.isFlash ? 1 : 0}`).join("|");
}

/**
 * Keeps Flash News fresh without reloading the whole terminal.
 */
export function useLiveFlashNews(initialEvents: NewsEvent[]) {
  const [events, setEvents] = useState(initialEvents);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fingerprintRef = useRef(flashFingerprint(initialEvents));

  useEffect(() => {
    const next = flashFingerprint(initialEvents);
    if (next !== fingerprintRef.current && initialEvents.length > 0) {
      fingerprintRef.current = next;
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function tick() {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const res = await fetch("/api/market/news/flash", {
          cache: "no-store",
          credentials: "same-origin",
        });
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
          const fp = flashFingerprint(nextEvents);
          if (fp !== fingerprintRef.current) {
            fingerprintRef.current = fp;
            setEvents(nextEvents);
          }
        }
        setFetchedAt(data.fetchedAt ?? new Date().toISOString());
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Flash-Feed getrennt");
        }
      } finally {
        inFlight = false;
      }
    }

    // Use SSR payload first; refresh later so mobile first paint stays light
    const hasInitial = initialEvents.length > 0;
    if (!hasInitial) void tick();
    const interval = window.setInterval(() => {
      void tick();
    }, FLASH_POLL_MS);
    const warmup = hasInitial
      ? window.setTimeout(() => void tick(), Math.min(15_000, FLASH_POLL_MS))
      : null;

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      if (warmup) window.clearTimeout(warmup);
    };
  }, []);

  return { events, fetchedAt, error, pollMs: FLASH_POLL_MS };
}
