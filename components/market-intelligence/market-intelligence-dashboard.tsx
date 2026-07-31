"use client";

import { Activity } from "lucide-react";
import { AlertCenter } from "@/components/market-intelligence/alert-center";
import { AlertNavBadge } from "@/components/market-intelligence/alert-nav-badge";
import { EnablePushAlertsButton } from "@/components/market-intelligence/enable-push-alerts-button";
import { ReplayValidationSection } from "@/components/market-intelligence/replay-validation-section";
import { LiveIndicator } from "@/components/market-intelligence/live-indicator";
import { NewsStatusBadge } from "@/components/market-intelligence/news-status-badge";
import { AlertHistory } from "@/components/market-intelligence/alert-history";
import { BreakingIntelligence } from "@/components/market-intelligence/breaking-intelligence";
import { LiveIntelligenceFeed } from "@/components/market-intelligence/live-intelligence-feed";
import { MarketCardsGrid } from "@/components/market-intelligence/market-cards-grid";
import { MarketEvents } from "@/components/market-intelligence/market-events";
import { SystemStatus } from "@/components/market-intelligence/system-status";
import { IntelligenceAlerts } from "@/components/market-intelligence/intelligence-alerts";
import { IntelligenceEventsSection } from "@/components/market-intelligence/intelligence-events-section";
import { OilIntelligenceSection } from "@/components/market-intelligence/oil-intelligence-section";
import { useMi } from "@/components/i18n/locale-provider";
import type { MarketIntelligenceDashboardData } from "@/lib/types/market";

interface MarketIntelligenceDashboardProps {
  data: MarketIntelligenceDashboardData;
}

export function MarketIntelligenceDashboard({ data }: MarketIntelligenceDashboardProps) {
  const t = useMi();

  return (
    <div className="space-y-8">
      <header className="space-y-3 border-b border-border pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 shadow-sm">
              <Activity className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">
                {t.moduleTitle}
              </h1>
              <p className="mt-1 text-sm text-muted lg:text-base">
                {t.moduleSubtitle}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 lg:w-72">
            {data.unreadAlertCount != null && data.unreadAlertCount > 0 && (
              <AlertNavBadge count={data.unreadAlertCount} />
            )}
            <SystemStatus health={data.systemHealth} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveIndicator
            isLive={data.systemHealth.isLive}
            dataAvailability={
              data.systemHealth.isLive
                ? (data.primaryQuotes.some((q) => q.dataAvailability === "LIVE") ||
                  data.quotes.some((q) => q.dataAvailability === "LIVE")
                    ? "LIVE"
                    : data.quotes.some((q) => q.dataAvailability === "DELAYED")
                      ? "DELAYED"
                      : "LIVE")
                : data.quotes[0]?.dataAvailability ?? "DEMO"
            }
          />
          <NewsStatusBadge
            newsHealth={data.systemHealth.newsHealth}
            newsEngine={data.systemHealth.newsEngine}
            operationsHealth={data.systemHealth.operationsHealth}
          />
        </div>
      </header>

      <MarketCardsGrid
        quotes={data.quotes}
        primaryQuotes={data.primaryQuotes}
        brentWtiSpread={data.brentWtiSpread}
      />

      <OilIntelligenceSection
        wti={data.primaryQuotes.find((q) => q.symbol === "WTI")}
        brent={data.primaryQuotes.find((q) => q.symbol === "BRENT")}
        spread={data.brentWtiSpread}
        oilCorrelation={data.oilCorrelation}
      />

      <LiveIntelligenceFeed entries={data.liveFeed} />

      <MarketEvents events={data.marketEvents} />

      {data.intelligenceAlerts.length > 0 && (
        <IntelligenceAlerts alerts={data.intelligenceAlerts} />
      )}

      <div id="alert-center">
        <AlertCenter alerts={data.deliveredAlerts ?? []} unreadCount={data.unreadAlertCount} />
      </div>

      <EnablePushAlertsButton />

      <ReplayValidationSection />

      {data.intelligenceEvents.length > 0 && (
        <IntelligenceEventsSection events={data.intelligenceEvents} />
      )}

      <BreakingIntelligence events={data.breakingNews} />

      <AlertHistory alerts={data.alerts} />

      <footer className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center">
        <p className="text-xs text-muted">
          {data.systemHealth.isLive ? t.footerLive : t.footerDemo}{" "}
          {t.footerDisclaimer}
        </p>
      </footer>
    </div>
  );
}
