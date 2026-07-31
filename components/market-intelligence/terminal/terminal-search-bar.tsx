"use client";

import { Input } from "@/components/ui/input";
import { useMi } from "@/components/i18n/locale-provider";
import type { TerminalSearchScope } from "@/lib/market-intelligence/terminal/terminal-search";
import { Search } from "lucide-react";

interface TerminalSearchBarProps {
  query: string;
  scope: TerminalSearchScope;
  minSeverity: string;
  onQueryChange: (query: string) => void;
  onScopeChange: (scope: TerminalSearchScope) => void;
  onMinSeverityChange: (severity: string) => void;
}

export function TerminalSearchBar({
  query,
  scope,
  minSeverity,
  onQueryChange,
  onScopeChange,
  onMinSeverityChange,
}: TerminalSearchBarProps) {
  const t = useMi();

  const scopes: { id: TerminalSearchScope; label: string }[] = [
    { id: "all", label: t.searchScopeAll },
    { id: "events", label: t.searchScopeEvents },
    { id: "alerts", label: t.searchScopeAlerts },
    { id: "news", label: t.searchScopeNews },
  ];

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <Input
          type="search"
          placeholder={t.searchPlaceholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="pl-9"
          aria-label={t.searchTerminalAria}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {scopes.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onScopeChange(s.id)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
              scope === s.id
                ? "bg-orange-400/15 text-orange-200 ring-1 ring-orange-300/25"
                : "bg-white/[0.06] text-slate-300"
            }`}
          >
            {s.label}
          </button>
        ))}
        <select
          value={minSeverity}
          onChange={(e) => onMinSeverityChange(e.target.value)}
          className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
          aria-label={t.minSeverityAria}
        >
          <option value="">{t.anySeverity}</option>
          <option value="MEDIUM">{t.severityMediumPlus}</option>
          <option value="HIGH">{t.severityHighPlus}</option>
          <option value="CRITICAL">{t.severityCriticalOnly}</option>
        </select>
      </div>
    </div>
  );
}
