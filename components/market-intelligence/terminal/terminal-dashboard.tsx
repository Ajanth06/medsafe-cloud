"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { AlertCenter } from "@/components/market-intelligence/alert-center";
import { AlertHistory } from "@/components/market-intelligence/alert-history";
import { BreakingIntelligence } from "@/components/market-intelligence/breaking-intelligence";
import { FlashNewsStrip } from "@/components/market-intelligence/flash-news-strip";
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
import { TerminalMarketPulse } from "@/components/market-intelligence/terminal/terminal-market-pulse";
import { MorningBriefing } from "@/components/market-intelligence/terminal/morning-briefing";
import { TerminalSearchBar } from "@/components/market-intelligence/terminal/terminal-search-bar";
import { WatchlistPanel, loadWatchlistFromStorage } from "@/components/market-intelligence/terminal/watchlist-panel";
import { useLiveFlashNews } from "@/components/market-intelligence/use-live-flash-news";
import { useLiveMarketQuotes } from "@/components/market-intelligence/use-live-market-quotes";
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
import {
  ArrowLeft,
  ArrowRight,
  LogOut,
  Newspaper,
  Radio,
  UserRound,
} from "lucide-react";

interface TerminalDashboardProps {
  data: MarketIntelligenceDashboardData;
}

const PRIMARY = new Set(["WTI", "BRENT"]);

function TerminalDashboardContent({ data }: TerminalDashboardProps) {
  const view = useTerminalView();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<TerminalSearchScope>("all");
  const [minSeverity, setMinSeverity] = useState("");
  // Defaults on SSR + first client render — localStorage only after mount (hydration-safe)
  const [watchlist, setWatchlist] = useState<string[]>(
    () => [...DEFAULT_TERMINAL_PREFERENCES.watchlistSymbols],
  );

  const live = useLiveMarketQuotes(data.quotes);
  const flash = useLiveFlashNews(data.breakingNews);
  const quotes = live.quotes;
  const breakingNews = flash.events;
  const primaryQuotes = useMemo(
    () => quotes.filter((q) => PRIMARY.has(q.symbol)),
    [quotes],
  );
  const isLive = live.connected && !live.isDemo;

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

  const watchlistQuotes = quotes.filter((q) => watchlist.includes(q.symbol));

  return (
    <div className="space-y-3 md:space-y-5">
      <header className="group/header rounded-[1.25rem] border border-white/10 bg-[#101c29]/85 p-3 text-white shadow-[0_14px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl md:rounded-[1.6rem] md:p-5">
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_8px_24px_rgba(249,115,22,0.25)] transition-transform duration-300 group-hover/header:rotate-3 group-hover/header:scale-105 md:h-10 md:w-10">
                <span className="font-mono text-[9px] font-black tracking-wider text-white">
                  AX
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.24em] text-orange-300">
                  AARYX
                </p>
                <h1 className="truncate text-base font-semibold tracking-tight text-white md:text-xl">
                  {miDe.terminalTitle}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Link
                href="/profile"
                aria-label="Profil öffnen"
                title="Profil öffnen"
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-cyan-200 md:h-10 md:w-10"
              >
                <UserRound className="h-[18px] w-[18px]" aria-hidden="true" />
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  aria-label="Abmelden"
                  title="Abmelden"
                  className="grid h-9 w-9 place-items-center rounded-xl border border-orange-300/20 bg-orange-400/10 text-orange-200 transition hover:border-orange-300/40 hover:bg-orange-400/20 md:h-10 md:w-10"
                >
                  <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            <LiveIndicator
              isLive={isLive || data.systemHealth.isLive}
              dataAvailability={
                isLive || data.systemHealth.isLive
                  ? (primaryQuotes.some((q) => q.dataAvailability === "LIVE") ||
                    quotes.some((q) => q.dataAvailability === "LIVE")
                      ? "LIVE"
                      : quotes.some((q) => q.dataAvailability === "DELAYED")
                        ? "DELAYED"
                        : "LIVE")
                  : quotes[0]?.dataAvailability ?? "DEMO"
              }
            />
            <span className="hidden items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-cyan-200 md:inline-flex">
              <Radio className="h-3 w-3 text-cyan-300" aria-hidden="true" />
              {live.connected ? `Live · ${data.systemHealth.dataSource}` : data.systemHealth.dataSource}
            </span>
            {live.lastPollAt && (
              <span className="hidden font-mono text-[9px] text-slate-400 md:inline">
                {new Date(live.lastPollAt).toLocaleTimeString("de-DE")}
              </span>
            )}
          </div>

          <TerminalNav unreadCount={data.unreadAlertCount} />
          <TerminalMarketPulse quotes={quotes} />
        </div>
      </header>

      <section className="group/news relative overflow-hidden rounded-[1.25rem] border border-orange-300/20 bg-gradient-to-r from-orange-400/10 via-[#101c29]/90 to-cyan-400/10 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.16)] backdrop-blur-xl transition duration-300 hover:border-orange-300/30 md:rounded-[1.5rem] md:p-5">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/15 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500 text-white shadow-[0_8px_20px_rgba(249,115,22,0.2)] transition-transform duration-300 group-hover/news:-rotate-3 group-hover/news:scale-105">
              <Newspaper className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div>
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300">
                News Intelligence
              </p>
              <h2 className="mt-0.5 text-base font-semibold text-white">
                Nachrichtenlage & Quellenstatus
              </h2>
              <p className="mt-1 hidden text-xs text-slate-300 md:block">
                Live-News, offizielle Quellen und Ereignis-Korrelation auf einen Blick.
              </p>
            </div>
          </div>

          <div className="flex w-full items-center justify-between gap-2 md:w-auto md:flex-col md:items-end">
            <NewsStatusBadge
              newsHealth={data.systemHealth.newsHealth}
              newsEngine={data.systemHealth.newsEngine}
              operationsHealth={data.systemHealth.operationsHealth}
            />
            <Link
              href="/market-intelligence?view=intelligence"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-300 transition hover:text-orange-200"
            >
              News öffnen
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-3 md:gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-4 md:space-y-6">
          {view === "intelligence" && (
            <Link
              href="/market-intelligence"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-200 shadow-sm transition hover:-translate-x-0.5 hover:border-orange-300/25 hover:bg-orange-400/10 hover:text-orange-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Zurück zur Übersicht
            </Link>
          )}

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
              <FlashNewsStrip events={breakingNews} />
              <MorningBriefing
                quotes={quotes}
                breakingNews={breakingNews}
                intelligenceEvents={data.intelligenceEvents}
                unreadAlertCount={data.unreadAlertCount ?? 0}
              />
              <MarketCardsGrid
                quotes={quotes}
                primaryQuotes={primaryQuotes}
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
                quotes={watchlistQuotes.length ? watchlistQuotes : quotes}
                primaryQuotes={primaryQuotes.filter((q) => watchlist.includes(q.symbol))}
                brentWtiSpread={data.brentWtiSpread}
              />
            </>
          )}

          {view === "oil" && (
            <OilTerminalView
              wti={primaryQuotes.find((q) => q.symbol === "WTI")}
              brent={primaryQuotes.find((q) => q.symbol === "BRENT")}
              spread={data.brentWtiSpread}
              oilCorrelation={data.oilCorrelation}
            />
          )}

          {view === "intelligence" && (
            <>
              <FlashNewsStrip events={breakingNews} />
              {data.intelligenceAlerts.length > 0 && (
                <IntelligenceAlerts alerts={data.intelligenceAlerts} />
              )}
              <IntelligenceEventsSection events={filteredIntel.length ? filteredIntel : data.intelligenceEvents} />
              <BreakingIntelligence events={breakingNews} />
              <OilIntelligenceSection
                wti={primaryQuotes.find((q) => q.symbol === "WTI")}
                brent={primaryQuotes.find((q) => q.symbol === "BRENT")}
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

      <footer className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center backdrop-blur">
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
