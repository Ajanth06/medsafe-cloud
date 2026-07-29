import type {
  DeliveredAlert,
  IntelligenceEventCluster,
  LiveFeedEntry,
  MarketEvent,
} from "@/lib/types/market";

export type TerminalSearchScope = "all" | "events" | "alerts" | "news";

export interface TerminalSearchInput {
  query: string;
  scope?: TerminalSearchScope;
  minSeverity?: string | null;
}

function matchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return text.toLowerCase().includes(q);
}

function severityRank(severity: string): number {
  const ranks: Record<string, number> = {
    INFO: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  };
  return ranks[severity] ?? 0;
}

function passesSeverity(severity: string, minSeverity: string | null | undefined): boolean {
  if (!minSeverity) return true;
  return severityRank(severity) >= severityRank(minSeverity);
}

export function filterIntelligenceEvents(
  events: IntelligenceEventCluster[],
  input: TerminalSearchInput,
): IntelligenceEventCluster[] {
  if (input.scope === "alerts") return [];
  return events.filter((event) => {
    const haystack = [event.headline, event.summary, event.eventType, ...event.potentiallyAffectedMarkets].join(" ");
    if (!matchesQuery(haystack, input.query)) return false;
    if (!passesSeverity(event.priority, input.minSeverity)) return false;
    return true;
  });
}

export function filterMarketEvents(
  events: MarketEvent[],
  input: TerminalSearchInput,
): MarketEvent[] {
  if (input.scope === "alerts" || input.scope === "news") return [];
  return events.filter((event) => {
    const haystack = [event.asset, event.symbol, event.description, event.eventType].join(" ");
    if (!matchesQuery(haystack, input.query)) return false;
    if (!passesSeverity(event.severity, input.minSeverity)) return false;
    return true;
  });
}

export function filterDeliveredAlerts(
  alerts: DeliveredAlert[],
  input: TerminalSearchInput,
): DeliveredAlert[] {
  if (input.scope === "events" || input.scope === "news") return [];
  return alerts.filter((alert) => {
    const haystack = [
      alert.title,
      alert.alertType,
      ...alert.affectedAssets.map((a) => a.symbol),
    ].join(" ");
    if (!matchesQuery(haystack, input.query)) return false;
    if (!passesSeverity(alert.severity, input.minSeverity)) return false;
    return true;
  });
}

export function filterLiveFeed(
  entries: LiveFeedEntry[],
  input: TerminalSearchInput,
): LiveFeedEntry[] {
  if (input.scope === "alerts") return [];
  return entries.filter((entry) => {
    const haystack = [entry.title, entry.description ?? "", entry.category].join(" ");
    if (!matchesQuery(haystack, input.query)) return false;
    if (entry.severity && !passesSeverity(entry.severity, input.minSeverity)) return false;
    return true;
  });
}
