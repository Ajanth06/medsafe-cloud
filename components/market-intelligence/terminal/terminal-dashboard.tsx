"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { LiveIndicator } from "@/components/market-intelligence/live-indicator";
import { MobileHomeHub } from "@/components/market-intelligence/mobile/mobile-home-hub";
import { SystemStatus } from "@/components/market-intelligence/system-status";
import { AlertPreferencesPanel } from "@/components/market-intelligence/terminal/alert-preferences-panel";
import { IntelligenceOverview } from "@/components/market-intelligence/terminal/intelligence-overview";
import { OilWorkspace } from "@/components/market-intelligence/terminal/oil-workspace";
import { TerminalNav, useTerminalView } from "@/components/market-intelligence/terminal/terminal-nav";
import { TerminalMarketPulse } from "@/components/market-intelligence/terminal/terminal-market-pulse";
import { useLiveFlashNews } from "@/components/market-intelligence/use-live-flash-news";
import { useLiveMarketQuotes } from "@/components/market-intelligence/use-live-market-quotes";
import { miDe } from "@/lib/market-intelligence/i18n/de";
import {
  DEFAULT_TERMINAL_PREFERENCES,
  type UserTerminalPreferences,
} from "@/lib/market-intelligence/user/preferences-types";
import type {
  AlertSeverity,
  DeliveredAlert,
  IntelligenceAlert,
  MarketIntelligenceDashboardData,
} from "@/lib/types/market";
import { LogOut, Radio, UserRound } from "lucide-react";

interface TerminalDashboardProps {
  data: MarketIntelligenceDashboardData;
}

const PRIMARY = new Set(["WTI", "BRENT"]);
const SEVERITY_RANK: Record<AlertSeverity, number> = {
  INFO: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};
const GEOPOLITICAL_TERMS =
  /iran|israel|hormuz|opec|sanction|military|attack|strike|houthi|yemen|red sea|russia|ukraine|saudi|geopolit/i;

function matchesPreferences(
  alert: IntelligenceAlert | DeliveredAlert,
  preferences: UserTerminalPreferences,
) {
  if (preferences.alertsPaused) return false;
  if (
    SEVERITY_RANK[alert.severity] <
    SEVERITY_RANK[preferences.minimumSeverity]
  ) {
    return false;
  }
  const description =
    "description" in alert
      ? `${alert.description} ${alert.possibleEvent ?? ""}`
      : alert.body;
  const oilRelated = alert.affectedAssets.some((asset) =>
    PRIMARY.has(asset.symbol),
  );
  const geopolitical = GEOPOLITICAL_TERMS.test(
    `${alert.title} ${description}`,
  );
  return (
    (preferences.oilAlerts && oilRelated) ||
    (preferences.geopoliticalAlerts && geopolitical)
  );
}

function TerminalDashboardContent({ data }: TerminalDashboardProps) {
  const view = useTerminalView();
  const [alertPreferences, setAlertPreferences] =
    useState<UserTerminalPreferences>(DEFAULT_TERMINAL_PREFERENCES);

  const live = useLiveMarketQuotes(data.quotes);
  const flash = useLiveFlashNews(data.breakingNews);
  const quotes = live.quotes;
  const breakingNews = flash.events;
  const primaryQuotes = useMemo(
    () => quotes.filter((q) => PRIMARY.has(q.symbol)),
    [quotes],
  );
  const oilMovePercent = useMemo(() => {
    const oils = primaryQuotes.filter((q) => q.price > 0);
    if (!oils.length) return 0;
    return Math.max(...oils.map((q) => Math.abs(q.percentageChange)));
  }, [primaryQuotes]);
  const isLive = live.connected && !live.isDemo;
  const visibleIntelligenceAlerts = useMemo(
    () =>
      data.intelligenceAlerts.filter((alert) =>
        matchesPreferences(alert, alertPreferences),
      ),
    [data.intelligenceAlerts, alertPreferences],
  );
  const visibleDeliveredAlerts = useMemo(
    () =>
      (data.deliveredAlerts ?? []).filter((alert) =>
        matchesPreferences(alert, alertPreferences),
      ),
    [data.deliveredAlerts, alertPreferences],
  );
  const visibleUnreadCount = visibleDeliveredAlerts.filter(
    (alert) => alert.readStatus === "UNREAD",
  ).length;

  useEffect(() => {
    const controller = new AbortController();
    async function loadPreferences() {
      try {
        const response = await fetch("/api/market/preferences", {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          preferences: UserTerminalPreferences;
        };
        setAlertPreferences({
          ...payload.preferences,
          minimumSeverity:
            payload.preferences.minimumSeverity === "LOW"
              ? "MEDIUM"
              : payload.preferences.minimumSeverity,
        });
      } catch {
        // Defaults remain active when preferences cannot be loaded.
      }
    }
    void loadPreferences();
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-3 pb-4 md:space-y-5">
      <header className="mobile-app-header group/header rounded-[1.25rem] border border-white/10 bg-[#101c29]/85 p-3 text-white shadow-[0_14px_40px_rgba(0,0,0,0.2)] backdrop-blur-xl md:rounded-[1.6rem] md:p-5">
        <div className="space-y-3 md:space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_8px_24px_rgba(249,115,22,0.25)] md:h-10 md:w-10">
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
                className="app-touch grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-cyan-200 md:h-10 md:w-10"
              >
                <UserRound className="h-[18px] w-[18px]" aria-hidden="true" />
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  aria-label="Abmelden"
                  title="Abmelden"
                  className="app-touch grid h-11 w-11 place-items-center rounded-xl border border-orange-300/20 bg-orange-400/10 text-orange-200 transition hover:border-orange-300/40 hover:bg-orange-400/20 md:h-10 md:w-10"
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
                  ? primaryQuotes.some((q) => q.dataAvailability === "LIVE") ||
                    quotes.some((q) => q.dataAvailability === "LIVE")
                    ? "LIVE"
                    : quotes.some((q) => q.dataAvailability === "DELAYED")
                      ? "DELAYED"
                      : "LIVE"
                  : quotes[0]?.dataAvailability ?? "DEMO"
              }
            />
            <span className="hidden items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-wider text-cyan-200 md:inline-flex">
              <Radio className="h-3 w-3 text-cyan-300" aria-hidden="true" />
              {live.connected
                ? `Live · ${data.systemHealth.dataSource}`
                : data.systemHealth.dataSource}
            </span>
            {live.lastPollAt && (
              <span className="hidden font-mono text-[9px] text-slate-400 md:inline">
                {new Date(live.lastPollAt).toLocaleTimeString("de-DE")}
              </span>
            )}
          </div>

          <TerminalMarketPulse quotes={quotes} />
        </div>
      </header>

      <div className="grid items-start gap-3 md:gap-5 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="min-w-0 space-y-4 md:space-y-6">
          {/* MOBILE overview: important news first */}
          {view === "overview" && (
            <>
              <MobileHomeHub
                quotes={quotes}
                breakingNews={breakingNews}
                unreadAlertCount={visibleUnreadCount}
                criticalAlertCount={
                  visibleIntelligenceAlerts.filter(
                    (alert) =>
                      alert.severity === "CRITICAL" ||
                      alert.severity === "HIGH",
                  ).length
                }
                oilMovePercent={oilMovePercent}
              />
              <div className="hidden space-y-6 md:block">
                <IntelligenceOverview
                  wti={primaryQuotes.find((quote) => quote.symbol === "WTI")}
                  brent={primaryQuotes.find(
                    (quote) => quote.symbol === "BRENT",
                  )}
                  intelligenceEvents={data.intelligenceEvents}
                  breakingNews={breakingNews}
                />
              </div>
            </>
          )}

          {/* ÖL: 01 Preise · 02 Flash · 03 Live Alerts · 04 KI Intelligence */}
          {view === "oil" && (
            <OilWorkspace
              wti={primaryQuotes.find((q) => q.symbol === "WTI")}
              brent={primaryQuotes.find((q) => q.symbol === "BRENT")}
              spread={data.brentWtiSpread}
              breakingNews={breakingNews}
              oilMovePercent={oilMovePercent}
              intelligenceEvents={data.intelligenceEvents}
              intelligenceAlerts={visibleIntelligenceAlerts}
              deliveredAlerts={visibleDeliveredAlerts}
              alertHistory={data.alerts}
              alertsPaused={alertPreferences.alertsPaused}
            />
          )}

          {/* SETTINGS */}
          {view === "settings" && (
            <>
              <header>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">
                  Preferences
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  Einstellungen
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  In-App Alerts, Prioritäten und relevante Ölthemen.
                </p>
              </header>
              <AlertPreferencesPanel
                onPreferencesChange={setAlertPreferences}
              />
            </>
          )}
        </div>

      {/* Desktop right rail: full section nav */}
      <aside className="sticky top-4 hidden space-y-3 xl:block">
          <TerminalNav unreadCount={visibleUnreadCount} variant="side" />
          <SystemStatus health={data.systemHealth} />
        </aside>
      </div>

      <footer className="hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center backdrop-blur md:block">
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
