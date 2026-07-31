"use client";

import { useEffect, useRef, useState } from "react";
import type { EnrichedMarketQuote } from "@/lib/types/market";

interface LiveQuotesPayload {
  quotes: EnrichedMarketQuote[];
  lastPollAt: string | null;
  isDemo: boolean;
  error?: string | null;
  refreshing?: boolean;
}

/** UI polls every 2.5s — server Yahoo refresh stays ~2s from cache. */
const LIVE_POLL_MS = 2_500;

function quotesFingerprint(quotes: EnrichedMarketQuote[]): string {
  return quotes
    .map((q) => `${q.symbol}:${q.price}:${q.percentageChange}:${q.dataAvailability}`)
    .join("|");
}

/**
 * Smooth live quotes: poll cache every second without waiting on Yahoo.
 */
export function useLiveMarketQuotes(initialQuotes: EnrichedMarketQuote[]) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [lastPollAt, setLastPollAt] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const fingerprintRef = useRef(quotesFingerprint(initialQuotes));

  useEffect(() => {
    const next = quotesFingerprint(initialQuotes);
    if (next !== fingerprintRef.current) {
      fingerprintRef.current = next;
      setQuotes(initialQuotes);
    }
  }, [initialQuotes]);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function tick() {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const res = await fetch("/api/market/quotes", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!res.ok) {
          if (!cancelled) {
            setConnected(false);
            setError(
              res.status === 429 ? "Rate limit — kurz warten" : `HTTP ${res.status}`,
            );
          }
          return;
        }
        const data = (await res.json()) as LiveQuotesPayload;
        if (cancelled) return;

        if (Array.isArray(data.quotes) && data.quotes.length > 0) {
          const next = quotesFingerprint(data.quotes);
          // Skip React re-render when prices unchanged → no UI stutter
          if (next !== fingerprintRef.current) {
            fingerprintRef.current = next;
            setQuotes(data.quotes);
          }
        }
        setLastPollAt(data.lastPollAt);
        setIsDemo(Boolean(data.isDemo));
        setError(data.error ?? null);
        setConnected(true);
      } catch (err) {
        if (!cancelled) {
          setConnected(false);
          setError(err instanceof Error ? err.message : "Live-Feed getrennt");
        }
      } finally {
        inFlight = false;
      }
    }

    void tick();
    const interval = window.setInterval(() => {
      void tick();
    }, LIVE_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return { quotes, lastPollAt, isDemo, error, connected, pollMs: LIVE_POLL_MS };
}
