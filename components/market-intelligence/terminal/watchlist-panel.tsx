"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MARKET_ASSETS } from "@/lib/market-intelligence/config/assets";
import {
  DEFAULT_TERMINAL_PREFERENCES,
  type UserTerminalPreferences,
} from "@/lib/market-intelligence/user/preferences-types";
import { miDe } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";

const WATCHLIST_STORAGE_KEY = "aaryx-watchlist";

interface WatchlistPanelProps {
  initialSymbols?: string[];
  onChange?: (symbols: string[]) => void;
}

export function WatchlistPanel({ initialSymbols, onChange }: WatchlistPanelProps) {
  const [symbols, setSymbols] = useState<string[]>(
    initialSymbols ?? DEFAULT_TERMINAL_PREFERENCES.watchlistSymbols,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialSymbols?.length) {
      setSymbols(initialSymbols);
    }
  }, [initialSymbols]);

  const persist = useCallback(async (next: string[]) => {
    setSymbols(next);
    onChange?.(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(next));
    }
    setSaving(true);
    try {
      await fetch("/api/market/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watchlistSymbols: next }),
      });
    } finally {
      setSaving(false);
    }
  }, [onChange]);

  function toggle(symbol: string) {
    const next = symbols.includes(symbol)
      ? symbols.filter((s) => s !== symbol)
      : [...symbols, symbol];
    void persist(next);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{miDe.watchlist}</h3>
        {saving && <span className="text-xs text-muted">{miDe.saving}</span>}
      </div>
      <p className="text-xs text-muted">
        {miDe.watchlistHint}
      </p>
      <div className="flex flex-wrap gap-2">
        {MARKET_ASSETS.map((asset) => {
          const active = symbols.includes(asset.symbol);
          return (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => toggle(asset.symbol)}
              className={cn(
                "rounded-lg border px-3 py-1.5 font-mono text-xs font-medium transition-colors",
                active
                  ? "border-orange-300/30 bg-orange-400/15 text-orange-200"
                  : "border-border bg-white/[0.04] text-slate-300 hover:border-cyan-300/30",
              )}
            >
              {asset.symbol}
            </button>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => void persist([...DEFAULT_TERMINAL_PREFERENCES.watchlistSymbols])}
      >
        {miDe.resetDefault}
      </Button>
    </section>
  );
}

export function loadWatchlistFromStorage(): string[] {
  if (typeof window === "undefined") return DEFAULT_TERMINAL_PREFERENCES.watchlistSymbols;
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    if (!raw) return DEFAULT_TERMINAL_PREFERENCES.watchlistSymbols;
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TERMINAL_PREFERENCES.watchlistSymbols;
  } catch {
    return DEFAULT_TERMINAL_PREFERENCES.watchlistSymbols;
  }
}
