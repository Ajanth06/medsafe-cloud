"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_TERMINAL_PREFERENCES,
  type UserTerminalPreferences,
} from "@/lib/market-intelligence/user/preferences-types";
import { useLabels, useMi } from "@/components/i18n/locale-provider";
import type { AlertSeverity } from "@/lib/types/market";

const SEVERITIES: AlertSeverity[] = ["MEDIUM", "HIGH", "CRITICAL"];

interface AlertPreferencesPanelProps {
  onPreferencesChange?: (preferences: UserTerminalPreferences) => void;
}

export function AlertPreferencesPanel({
  onPreferencesChange,
}: AlertPreferencesPanelProps) {
  const t = useMi();
  const { tSeverity } = useLabels();

  const [prefs, setPrefs] = useState<UserTerminalPreferences>(DEFAULT_TERMINAL_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/market/preferences", { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as {
          preferences: UserTerminalPreferences;
        };
      })
      .then((data) => {
        if (!data) return;
        const preferences = {
          ...data.preferences,
          minimumSeverity:
            data.preferences.minimumSeverity === "LOW"
              ? ("MEDIUM" as const)
              : data.preferences.minimumSeverity,
        };
        setPrefs(preferences);
        onPreferencesChange?.(preferences);
      })
      .catch(() => {
        // Defaults remain visible if preferences cannot be loaded.
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [onPreferencesChange]);

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
        onPreferencesChange?.(data.preferences);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted">{t.loadingPreferences}</p>;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#101c29]/90 p-5">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              {t.intelAlertSettings}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {t.changesAutoSaved}
            </p>
          </div>
          {saving && (
            <span className="font-mono text-[9px] uppercase text-cyan-300">
              {t.saving}
            </span>
          )}
        </div>

        <label className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-white/8 bg-white/[0.04] px-3 text-sm text-slate-200">
          <span>
            <span className="block font-medium">{t.pauseAllAlerts}</span>
            <span className="block text-[10px] text-slate-500">
              {t.hidesAllIntelAlerts}
            </span>
          </span>
          <input
            type="checkbox"
            checked={prefs.alertsPaused}
            onChange={(e) => void save({ alertsPaused: e.target.checked })}
            className="h-4 w-4 accent-orange-500"
          />
        </label>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-400">
            {t.minPriority}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void save({ minimumSeverity: s })}
                className={`app-touch min-h-11 rounded-xl px-3 py-2 text-xs font-medium transition ${
                  prefs.minimumSeverity === s
                    ? "bg-orange-500/15 text-orange-100 ring-1 ring-orange-400/30"
                    : "bg-white/[0.05] text-slate-400 hover:bg-white/[0.08]"
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
              ["oilAlerts", t.categories.oil],
              ["geopoliticalAlerts", t.categories.geo],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm text-slate-200"
            >
              <span className="font-medium">{label}</span>
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) => void save({ [key]: e.target.checked })}
                className="h-4 w-4 accent-orange-500"
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
