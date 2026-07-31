"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useLocale } from "@/components/i18n/locale-provider";
import { getMi } from "@/lib/i18n/mi";
import type { EnrichedMarketQuote } from "@/lib/types/market";

interface LiveQuotesPayload {
  quotes: EnrichedMarketQuote[];
  lastPollAt: string | null;
  isDemo: boolean;
  error?: string | null;
  refreshing?: boolean;
}

/** Steady poll — cache is fast; no need to hammer. */
const LIVE_POLL_MS = 4_000;

function quotesFingerprint(quotes: EnrichedMarketQuote[]): string {
  return quotes
    .map(
      (q) =>
        `${q.symbol}:${q.price}:${q.percentageChange}:${q.dataAvailability}`,
    )
    .join("|");
}

/**
 * Live quotes from server cache — never blocks on Yahoo in the API.
 */
export function useLiveMarketQuotes(initialQuotes: EnrichedMarketQuote[]) {
  const { locale } = useLocale();
  const [quotes, setQuotes] = useState(initialQuotes);
  const [lastPollAt, setLastPollAt] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const fingerprintRef = useRef(quotesFingerprint(initialQuotes));
  const hasQuotesRef = useRef(initialQuotes.some((q) => q.price > 0));

  useEffect(() => {
    const next = quotesFingerprint(initialQuotes);
    if (next !== fingerprintRef.current) {
      fingerprintRef.current = next;
      setQuotes(initialQuotes);
      hasQuotesRef.current = initialQuotes.some((q) => q.price > 0);
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
              res.status === 429
                ? getMi(locale).rateLimitWait
                : `HTTP ${res.status}`,
            );
          }
          return;
        }
        const data = (await res.json()) as LiveQuotesPayload;
        if (cancelled) return;

        if (Array.isArray(data.quotes) && data.quotes.length > 0) {
          hasQuotesRef.current = true;
          const next = quotesFingerprint(data.quotes);
          if (next !== fingerprintRef.current) {
            fingerprintRef.current = next;
            startTransition(() => setQuotes(data.quotes ?? []));
          }
        }
        setLastPollAt(data.lastPollAt);
        setIsDemo(Boolean(data.isDemo));
        setError(data.error ?? null);
        setConnected(true);
      } catch (err) {
        if (!cancelled) {
          setConnected(false);
          setError(err instanceof Error ? err.message : getMi(locale).liveFeedDisconnected);
        }
      } finally {
        inFlight = false;
      }
    }

    void tick();

    // Only burst while empty — stop as soon as prices land
    const burst = window.setInterval(() => {
      if (hasQuotesRef.current) {
        window.clearInterval(burst);
        return;
      }
      void tick();
    }, 1_200);
    const stopBurst = window.setTimeout(() => {
      window.clearInterval(burst);
    }, 5_000);

    const interval = window.setInterval(() => void tick(), LIVE_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearInterval(burst);
      window.clearTimeout(stopBurst);
    };
  }, [locale]);

  return { quotes, lastPollAt, isDemo, error, connected, pollMs: LIVE_POLL_MS };
}
