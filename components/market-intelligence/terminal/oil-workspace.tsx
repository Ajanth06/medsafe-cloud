"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BellRing, Brain, Droplets, Globe2 } from "lucide-react";
import { AlertHistory } from "@/components/market-intelligence/alert-history";
import { FlashNewsStrip } from "@/components/market-intelligence/flash-news-strip";
import { PriceChart } from "@/components/market-intelligence/price-chart";
import { AiIntelligenceView } from "@/components/market-intelligence/terminal/ai-intelligence-view";
import { GeopoliticalOilMonitor } from "@/components/market-intelligence/terminal/geopolitical-oil-monitor";
import { IntelligenceAlertWorkspace } from "@/components/market-intelligence/terminal/intelligence-alert-workspace";
import { formatChange, formatPrice } from "@/lib/market-intelligence/format";
import { useMi } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type {
  BrentWTISpread,
  DeliveredAlert,
  EnrichedMarketQuote,
  IntelligenceAlert,
  IntelligenceEventCluster,
  MarketAlert,
  NewsEvent,
} from "@/lib/types/market";

interface OilWorkspaceProps {
  wti?: EnrichedMarketQuote;
  brent?: EnrichedMarketQuote;
  spread: BrentWTISpread | null;
  breakingNews: NewsEvent[];
  oilMovePercent: number;
  intelligenceEvents: IntelligenceEventCluster[];
  intelligenceAlerts: IntelligenceAlert[];
  deliveredAlerts: DeliveredAlert[];
  alertHistory: MarketAlert[];
  alertsPaused?: boolean;
}

type OilView = "overview" | "geo" | "ai" | "alerts";

const OIL_VIEW_ICONS: Record<OilView, typeof Droplets> = {
  overview: Droplets,
  geo: Globe2,
  ai: Brain,
  alerts: BellRing,
};

function resolveOilView(
  view: string | null,
  oilView: string | null,
): OilView {
  if (view === "geo" || view === "ai" || view === "alerts") return view;
  if (oilView === "geo" || oilView === "ai" || oilView === "alerts") {
    return oilView;
  }
  return "overview";
}

function SectionLabel({
  step,
  title,
  subtitle,
}: {
  step: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-end gap-3 border-b border-white/8 pb-2">
      <span className="font-mono text-[10px] font-black text-orange-300">
        {step}
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-100">
          {title}
        </h2>
        <p className="text-[11px] text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

/**
 * Dedicated oil market page: prices and oil-only flash feed.
 */
export function OilWorkspace({
  wti,
  brent,
  spread,
  breakingNews,
  oilMovePercent,
  intelligenceEvents,
  intelligenceAlerts,
  deliveredAlerts,
  alertHistory,
  alertsPaused = false,
}: OilWorkspaceProps) {
  const t = useMi();

  const searchParams = useSearchParams();
  const activeView = resolveOilView(
    searchParams.get("view"),
    searchParams.get("oilView"),
  );

  const oilViews: {
    id: OilView;
    label: string;
    hint: string;
    icon: typeof Droplets;
  }[] = [
    {
      id: "overview",
      label: t.oilOverview,
      hint: t.oilOverviewHint,
      icon: OIL_VIEW_ICONS.overview,
    },
    {
      id: "geo",
      label: t.geoMonitor,
      hint: t.geoMonitorHint,
      icon: OIL_VIEW_ICONS.geo,
    },
    {
      id: "ai",
      label: t.kiIntelligence,
      hint: t.oilIntelHint,
      icon: OIL_VIEW_ICONS.ai,
    },
    {
      id: "alerts",
      label: t.intelAlerts,
      hint: t.intelAlertsHint,
      icon: OIL_VIEW_ICONS.alerts,
    },
  ];

  return (
    <div className="space-y-7">
      <header>
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300">
          {t.oilTerminal}
        </p>
        <h1 className="mt-1 text-xl font-semibold text-white">
          {t.oilTerminalTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {t.oilPricesIntro}
        </p>
      </header>

      <nav
        className="app-horizontal-scroll -mx-2.5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-2.5 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:rounded-2xl sm:border sm:border-white/10 sm:bg-[#0d1925]/90 sm:p-2 xl:grid-cols-4"
        aria-label={t.oilSectionsAria}
      >
        {oilViews.map(({ id, label, hint, icon: Icon }) => (
          <Link
            key={id}
            href={
              id === "overview"
                ? "/market-intelligence?view=oil"
                : `/market-intelligence?view=oil&oilView=${id}`
            }
            className={cn(
              "app-touch mobile-native-card flex min-h-[4.1rem] w-[10.25rem] shrink-0 snap-start items-start gap-2.5 rounded-[1rem] border border-white/8 px-3 py-2.5 transition sm:w-auto sm:border-transparent",
              activeView === id
                ? "bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-[0_8px_20px_rgba(249,115,22,0.18)]"
                : "bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]",
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                activeView === id ? "text-white" : "text-slate-500",
              )}
              aria-hidden="true"
            />
            <span>
              <span className="block text-xs font-semibold">{label}</span>
              <span
                className={cn(
                  "mt-0.5 block text-[9px]",
                  activeView === id ? "text-white/75" : "text-slate-500",
                )}
              >
                {hint}
              </span>
            </span>
          </Link>
        ))}
      </nav>

      {activeView === "overview" && (
        <div className="min-w-0 space-y-7">
          {/* 1 Preise */}
          <section className="space-y-3">
            <SectionLabel
              step="01"
              title={t.pricesSection}
              subtitle={t.pricesSubtitle}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {wti && <OilPriceCard quote={wti} />}
              {brent && <OilPriceCard quote={brent} />}
            </div>
            {spread && (
              <div className="rounded-xl border border-white/10 bg-[#101c29]/90 px-4 py-3 text-slate-100">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {t.brentWtiSpread}
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-3">
                  <p className="font-mono text-2xl font-semibold">
                    ${spread.spread.toFixed(2)}
                  </p>
                  <p
                    className={cn(
                      "text-sm",
                      spread.spreadChangePercent >= 0
                        ? "text-emerald-400"
                        : "text-red-400",
                    )}
                  >
                    {formatChange(spread.spreadChangePercent, true)}{" "}
                    {t.vsPrior}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* 2 Flash News */}
          <section className="space-y-3">
            <SectionLabel
              step="02"
              title={t.oilFlashTitle}
              subtitle={t.oilFlashSubtitle}
            />
            <FlashNewsStrip
              events={breakingNews}
              oilMovePercent={oilMovePercent}
              allowedTopics={["oil", "iran", "opec", "inventory"]}
              heading={t.flashHeadingOil}
            />
          </section>
        </div>
      )}

      {activeView === "geo" && (
        <GeopoliticalOilMonitor
          events={intelligenceEvents}
          breakingNews={breakingNews}
        />
      )}

      {activeView === "ai" && (
        <AiIntelligenceView
          wti={wti}
          brent={brent}
          breakingNews={breakingNews}
          intelligenceEvents={intelligenceEvents}
        />
      )}

      {activeView === "alerts" && (
        <div className="space-y-6">
          <IntelligenceAlertWorkspace
            intelligenceAlerts={intelligenceAlerts}
            deliveredAlerts={deliveredAlerts}
            intelligenceEvents={intelligenceEvents}
            paused={alertsPaused}
          />
          <AlertHistory alerts={alertHistory} />
        </div>
      )}
    </div>
  );
}

function OilPriceCard({ quote }: { quote: EnrichedMarketQuote }) {
  const t = useMi();
  const positive = quote.direction === "up";
  const hot =
    quote.volatilityStatus !== "NORMAL" ||
    Math.abs(quote.percentageChange) >= 0.8;
  const observedPrices = [...quote.sparkline, quote.price].filter(
    (price) => Number.isFinite(price) && price > 0,
  );
  const dayHigh = observedPrices.length
    ? Math.max(...observedPrices)
    : quote.price;
  const dayLow = observedPrices.length
    ? Math.min(...observedPrices)
    : quote.price;

  return (
    <div className="rounded-2xl border border-white/10 bg-[#101c29]/90 p-4 text-slate-100">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {quote.symbol}
          </p>
          {hot && (
            <span className="mt-1 inline-block rounded bg-orange-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-orange-200">
              HOT
            </span>
          )}
        </div>
        <p className="font-mono text-2xl font-semibold">
          {formatPrice(quote.price, quote.symbol)}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MarketStat
          label={t.dayHigh}
          value={formatPrice(dayHigh, quote.symbol)}
        />
        <MarketStat
          label={t.dayLow}
          value={formatPrice(dayLow, quote.symbol)}
        />
        <MarketStat
          label={t.changeLabel}
          value={formatChange(quote.percentageChange, true)}
          tone={positive ? "up" : "down"}
        />
        <MarketStat
          label={t.volatilityLabel}
          value={quote.volatilityStatus.replace(/_/g, " ")}
          tone={hot ? "hot" : "neutral"}
        />
      </div>
      <div className="mt-3">
        <PriceChart
          data={quote.sparkline ?? []}
          positive={positive}
          height={100}
          label={t.priceAction60m}
        />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
        <Mom label="5M" value={quote.returns.m5} />
        <Mom label="15M" value={quote.returns.m15} />
        <Mom label="1H" value={quote.returns.m60} />
      </div>
    </div>
  );
}

function MarketStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "hot" | "neutral";
}) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.04] p-2.5">
      <p className="text-[9px] uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1 truncate font-mono text-[11px] font-semibold",
          tone === "up"
            ? "text-emerald-300"
            : tone === "down"
              ? "text-red-300"
              : tone === "hot"
                ? "text-orange-200"
                : "text-white",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Mom({ label, value }: { label: string; value?: number }) {
  if (value === undefined) return null;
  return (
    <div className="rounded-lg bg-white/[0.06] p-1.5">
      <p className="text-slate-500">{label}</p>
      <p
        className={cn(
          "font-mono font-semibold",
          value > 0
            ? "text-emerald-400"
            : value < 0
              ? "text-red-400"
              : "text-slate-400",
        )}
      >
        {formatChange(value, true)}
      </p>
    </div>
  );
}
