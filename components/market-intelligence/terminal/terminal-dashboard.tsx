"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { AlertCenter } from "@/components/market-intelligence/alert-center";
import { AlertHistory } from "@/components/market-intelligence/alert-history";
import { BreakingIntelligence } from "@/components/market-intelligence/breaking-intelligence";
import { EnablePushAlertsButton } from "@/components/market-intelligence/enable-push-alerts-button";
import { IntelligenceAlerts } from "@/components/market-intelligence/intelligence-alerts";
import { IntelligenceEventsSection } from "@/components/market-intelligence/intelligence-events-section";
import { IntelligenceTimeline } from "@/components/market-intelligence/intelligence-timeline";
import { LiveIndicator } from "@/components/market-intelligence/live-indicator";
import { LiveIntelligenceFeed } from "@/components/market-intelligence/live-intelligence-feed";
import { NewsStatusBadge } from "@/components/market-intelligence/news-status-badge";
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
import { DEFAULT_TERMINAL_PREFERENCES } from "@/lib/market-intelligence/user/preferences-types";
import { miDe } from "@/lib/market-intelligence/i18n/de";
import type { MarketIntelligenceDashboardData } from "@/lib/types/market";
import { ArrowRight, LogOut, Newspaper, Radio, UserRound } from "lucide-react";

interface TerminalDashboardProps {
  data: MarketIntelligenceDashboardData;
}

function TerminalDashboardContent({ data }: TerminalDashboardProps) {
  const view = useTerminalView();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<TerminalSearchScope>("all");
  const [minSeverity, setMinSeverity] = useState("");
  // Defaults on SSR + first client render — localStorage only after mount (hydration-safe)
  const [watchlist, setWatchlist] = useState<string[]>(
    () => [...DEFAULT_TERMINAL_PREFERENCES.watchlistSymbols],
  );

  useEffect(() => {
    const hydrationSync = window.setTimeout(() => {
      setWatchlist(loadWatchlistFromStorage());
    }, 0);

    return () => window.clearTimeout(hydrationSync);
  }, []);

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
    <div className="space-y-5">
      <header className="rounded-[1.6rem] border border-[#171717]/10 bg-white/85 p-3.5 text-[#171717] shadow-[0_14px_40px_rgba(23,23,23,0.09)] backdrop-blur-xl sm:p-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d24b2f]">
                <span className="font-mono text-[9px] font-black tracking-wider text-white">
                  AX
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.24em] text-[#d24b2f]">
                  AARYX
                </p>
                <h1 className="truncate text-lg font-semibold tracking-tight text-[#171717] sm:text-xl">
                  {miDe.terminalTitle}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Link
                href="/profile"
                aria-label="Profil öffnen"
                title="Profil öffnen"
                className="grid h-10 w-10 place-items-center rounded-xl border border-[#171717]/10 bg-[#f7f3ea] text-[#3f3a32] transition hover:border-cyan-500/40 hover:bg-cyan-50 hover:text-cyan-700"
              >
                <UserRound className="h-[18px] w-[18px]" aria-hidden="true" />
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  aria-label="Abmelden"
                  title="Abmelden"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-orange-200 bg-orange-50 text-[#d24b2f] transition hover:border-orange-300 hover:bg-orange-100"
                >
                  <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-[#171717]/10 pt-3">
            <LiveIndicator
              isLive={data.systemHealth.isLive}
              dataAvailability={
                data.systemHealth.isLive
                  ? "LIVE"
                  : data.quotes[0]?.dataAvailability ?? "DEMO"
              }
            />
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-cyan-800">
              <Radio className="h-3 w-3 text-cyan-600" aria-hidden="true" />
              {data.systemHealth.dataSource}
            </span>
          </div>

          <TerminalNav unreadCount={data.unreadAlertCount} />
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[1.5rem] border border-orange-200/80 bg-gradient-to-r from-orange-50 via-white to-cyan-50 p-4 shadow-[0_10px_30px_rgba(23,23,23,0.06)] sm:p-5">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#d24b2f] text-white shadow-[0_8px_20px_rgba(210,75,47,0.2)]">
              <Newspaper className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#d24b2f]">
                News Intelligence
              </p>
              <h2 className="mt-0.5 text-base font-semibold text-[#171717]">
                Nachrichtenlage & Quellenstatus
              </h2>
              <p className="mt-1 text-xs text-[#3f3a32]/65">
                Live-News, offizielle Quellen und Ereignis-Korrelation auf einen Blick.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <NewsStatusBadge
              newsHealth={data.systemHealth.newsHealth}
              newsEngine={data.systemHealth.newsEngine}
              operationsHealth={data.systemHealth.operationsHealth}
              variant="light"
            />
            <Link
              href="/market-intelligence?view=intelligence"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d24b2f] transition hover:text-orange-700"
            >
              News öffnen
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-6">
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
              <div className="grid gap-6 2xl:grid-cols-2">
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
        </div>

        <aside className="sticky top-4 hidden xl:block">
          <SystemStatus health={data.systemHealth} />
        </aside>
      </div>

      <footer className="rounded-2xl border border-[#171717]/10 bg-white/55 p-4 text-center backdrop-blur">
        <p className="text-xs text-muted">
          {data.systemHealth.isLive ? miDe.footerLive : miDe.footerDemo}{" "}
          {miDe.footerDisclaimer}
        </p>
      </footer>
    </div>
  );
}

export function TerminalDashboard({ data }: TerminalDashboardProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">{miDe.loadingTerminal}</p>}>
      <TerminalDashboardContent data={data} />
    </Suspense>
  );
}
