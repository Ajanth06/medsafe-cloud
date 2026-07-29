"use client";

import { Suspense, useMemo, useState } from "react";
import { AlertCenter } from "@/components/market-intelligence/alert-center";
import { AlertHistory } from "@/components/market-intelligence/alert-history";
import { BreakingIntelligence } from "@/components/market-intelligence/breaking-intelligence";
import { EnablePushAlertsButton } from "@/components/market-intelligence/enable-push-alerts-button";
import { IntelligenceAlerts } from "@/components/market-intelligence/intelligence-alerts";
import { IntelligenceEventsSection } from "@/components/market-intelligence/intelligence-events-section";
import { IntelligenceTimeline } from "@/components/market-intelligence/intelligence-timeline";
import { LiveIndicator } from "@/components/market-intelligence/live-indicator";
import { LiveIntelligenceFeed } from "@/components/market-intelligence/live-intelligence-feed";
import { MarketCardsGrid } from "@/components/market-intelligence/market-cards-grid";
import { MarketEvents } from "@/components/market-intelligence/market-events";
import { OilIntelligenceSection } from "@/components/market-intelligence/oil-intelligence-section";
import { ReplayValidationSection } from "@/components/market-intelligence/replay-validation-section";
import { SystemStatus } from "@/components/market-intelligence/system-status";
import { AlertPreferencesPanel } from "@/components/market-intelligence/terminal/alert-preferences-panel";
import { OilTerminalView } from "@/components/market-intelligence/terminal/oil-terminal-view";
import { OperationsConsole } from "@/components/market-intelligence/terminal/operations-console";
import { ValidationDashboard } from "@/components/market-intelligence/terminal/validation-dashboard";
import { TerminalNav, useTerminalView } from "@/components/market-intelligence/terminal/terminal-nav";
import { TerminalSearchBar } from "@/components/market-intelligence/terminal/terminal-search-bar";
import { WatchlistPanel, loadWatchlistFromStorage } from "@/components/market-intelligence/terminal/watchlist-panel";
import {
  filterDeliveredAlerts,
  filterIntelligenceEvents,
  filterLiveFeed,
  filterMarketEvents,
  type TerminalSearchScope,
} from "@/lib/market-intelligence/terminal/terminal-search";
import type { MarketIntelligenceDashboardData } from "@/lib/types/market";
import { Activity } from "lucide-react";

interface TerminalDashboardProps {
  data: MarketIntelligenceDashboardData;
}

function TerminalDashboardContent({ data }: TerminalDashboardProps) {
  const view = useTerminalView();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<TerminalSearchScope>("all");
  const [minSeverity, setMinSeverity] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>(() => loadWatchlistFromStorage());

  const searchInput = useMemo(
    () => ({ query, scope, minSeverity: minSeverity || null }),
    [query, scope, minSeverity],
  );

  const filteredIntel = useMemo(
    () => filterIntelligenceEvents(data.intelligenceEvents, searchInput),
    [data.intelligenceEvents, searchInput],
  );
  const filteredMarketEvents = useMemo(
    () => filterMarketEvents(data.marketEvents, searchInput),
    [data.marketEvents, searchInput],
  );
  const filteredAlerts = useMemo(
    () => filterDeliveredAlerts(data.deliveredAlerts ?? [], searchInput),
    [data.deliveredAlerts, searchInput],
  );
  const filteredFeed = useMemo(
    () => filterLiveFeed(data.liveFeed, searchInput),
    [data.liveFeed, searchInput],
  );

  const watchlistQuotes = data.quotes.filter((q) => watchlist.includes(q.symbol));

  return (
    <div className="space-y-6">
      <header className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
              <Activity className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
                AARYX Terminal
              </h1>
              <p className="mt-1 text-sm text-muted lg:text-base">
                Market Intelligence Control Center
              </p>
            </div>
          </div>
          <div className="lg:w-72">
            <SystemStatus health={data.systemHealth} />
          </div>
        </div>
        <LiveIndicator
          isLive={data.systemHealth.isLive}
          dataAvailability={
            data.systemHealth.isLive ? "LIVE" : data.quotes[0]?.dataAvailability ?? "DEMO"
          }
        />
        <TerminalNav unreadCount={data.unreadAlertCount} />
      </header>

      {(view === "intelligence" || view === "alerts") && (
        <TerminalSearchBar
          query={query}
          scope={scope}
          minSeverity={minSeverity}
          onQueryChange={setQuery}
          onScopeChange={setScope}
          onMinSeverityChange={setMinSeverity}
        />
      )}

      {view === "overview" && (
        <>
          <MarketCardsGrid
            quotes={data.quotes}
            primaryQuotes={data.primaryQuotes}
            brentWtiSpread={data.brentWtiSpread}
          />
          <LiveIntelligenceFeed entries={filteredFeed.length ? filteredFeed : data.liveFeed} />
          <div className="grid gap-8 xl:grid-cols-2">
            <MarketEvents events={filteredMarketEvents.length ? filteredMarketEvents : data.marketEvents} />
            <IntelligenceTimeline events={data.timeline} />
          </div>
        </>
      )}

      {view === "markets" && (
        <>
          <WatchlistPanel initialSymbols={watchlist} onChange={setWatchlist} />
          <MarketCardsGrid
            quotes={watchlistQuotes.length ? watchlistQuotes : data.quotes}
            primaryQuotes={data.primaryQuotes.filter((q) => watchlist.includes(q.symbol))}
            brentWtiSpread={data.brentWtiSpread}
          />
        </>
      )}

      {view === "oil" && (
        <OilTerminalView
          wti={data.primaryQuotes.find((q) => q.symbol === "WTI")}
          brent={data.primaryQuotes.find((q) => q.symbol === "BRENT")}
          spread={data.brentWtiSpread}
          oilCorrelation={data.oilCorrelation}
        />
      )}

      {view === "intelligence" && (
        <>
          {data.intelligenceAlerts.length > 0 && (
            <IntelligenceAlerts alerts={data.intelligenceAlerts} />
          )}
          <IntelligenceEventsSection events={filteredIntel.length ? filteredIntel : data.intelligenceEvents} />
          <BreakingIntelligence events={data.breakingNews} />
          <OilIntelligenceSection
            wti={data.primaryQuotes.find((q) => q.symbol === "WTI")}
            brent={data.primaryQuotes.find((q) => q.symbol === "BRENT")}
            spread={data.brentWtiSpread}
            oilCorrelation={data.oilCorrelation}
          />
        </>
      )}

      {view === "alerts" && (
        <>
          <AlertCenter
            alerts={filteredAlerts.length ? filteredAlerts : (data.deliveredAlerts ?? [])}
            unreadCount={data.unreadAlertCount}
          />
          <AlertHistory alerts={data.alerts} />
        </>
      )}

      {view === "operations" && (
        <>
          <ValidationDashboard />
          <OperationsConsole />
          <ReplayValidationSection />
        </>
      )}

      {view === "settings" && (
        <>
          <AlertPreferencesPanel />
          <WatchlistPanel initialSymbols={watchlist} onChange={setWatchlist} />
          <EnablePushAlertsButton />
        </>
      )}

      <footer className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center">
        <p className="text-xs text-muted">
          {data.systemHealth.isLive
            ? "Live market data active."
            : "Development demo data — set MARKET_DATA_PROVIDER=polygon and MARKET_DATA_API_KEY for live feeds."}{" "}
          Separate module — no healthcare data. Not financial advice. No BUY/SELL signals.
        </p>
      </footer>
    </div>
  );
}

export function TerminalDashboard({ data }: TerminalDashboardProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading terminal…</p>}>
      <TerminalDashboardContent data={data} />
    </Suspense>
  );
}
