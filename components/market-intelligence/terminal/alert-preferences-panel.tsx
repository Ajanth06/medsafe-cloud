"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEFAULT_TERMINAL_PREFERENCES,
  type UserTerminalPreferences,
} from "@/lib/market-intelligence/user/preferences-types";
import { miDe, tSeverity } from "@/lib/market-intelligence/i18n/de";
import type { AlertSeverity } from "@/lib/types/market";

const SEVERITIES: AlertSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function AlertPreferencesPanel() {
  const [prefs, setPrefs] = useState<UserTerminalPreferences>(DEFAULT_TERMINAL_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/market/preferences");
      if (res.ok) {
        const data = (await res.json()) as { preferences: UserTerminalPreferences };
        setPrefs(data.preferences);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(patch: Partial<UserTerminalPreferences>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    try {
      const res = await fetch("/api/market/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = (await res.json()) as { preferences: UserTerminalPreferences };
        setPrefs(data.preferences);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">{miDe.loadingPreferences}</p>;
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{miDe.alertPreferences}</h3>
          {saving && <span className="text-xs text-muted">{miDe.saving}</span>}
        </div>

        <label className="flex items-center justify-between gap-4 text-sm">
          <span>{miDe.pauseAllAlerts}</span>
          <input
            type="checkbox"
            checked={prefs.alertsPaused}
            onChange={(e) => void save({ alertsPaused: e.target.checked })}
          />
        </label>

        <div>
          <p className="mb-2 text-xs font-medium text-muted">{miDe.minSeverity}</p>
          <div className="flex flex-wrap gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void save({ minimumSeverity: s })}
                className={`rounded-lg px-3 py-1 text-xs font-medium ${
                  prefs.minimumSeverity === s
                    ? "bg-orange-400/15 text-orange-200 ring-1 ring-orange-300/25"
                    : "bg-white/[0.06] text-slate-300"
                }`}
              >
                {tSeverity(s)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["oilAlerts", miDe.categories.oil],
              ["geopoliticalAlerts", miDe.categories.geo],
              ["macroAlerts", miDe.categories.macro],
              ["cryptoAlerts", miDe.categories.crypto],
              ["equityAlerts", miDe.categories.equities],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) => void save({ [key]: e.target.checked })}
              />
            </label>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          {miDe.refresh}
        </Button>
      </CardContent>
    </Card>
  );
}
