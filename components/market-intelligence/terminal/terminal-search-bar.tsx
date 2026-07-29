"use client";

import { Input } from "@/components/ui/input";
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

const SCOPES: { id: TerminalSearchScope; label: string }[] = [
  { id: "all", label: "All" },
  { id: "events", label: "Events" },
  { id: "alerts", label: "Alerts" },
  { id: "news", label: "News" },
];

export function TerminalSearchBar({
  query,
  scope,
  minSeverity,
  onQueryChange,
  onScopeChange,
  onMinSeverityChange,
}: TerminalSearchBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Search events, alerts, symbols…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="pl-9"
          aria-label="Search terminal"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onScopeChange(s.id)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
              scope === s.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {s.label}
          </button>
        ))}
        <select
          value={minSeverity}
          onChange={(e) => onMinSeverityChange(e.target.value)}
          className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs"
          aria-label="Minimum severity"
        >
          <option value="">Any severity</option>
          <option value="MEDIUM">Medium+</option>
          <option value="HIGH">High+</option>
          <option value="CRITICAL">Critical only</option>
        </select>
      </div>
    </div>
  );
}
