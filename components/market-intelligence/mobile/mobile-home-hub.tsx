"use client";

import Link from "next/link";
import { ArrowRight, Bell, Flame, Newspaper } from "lucide-react";
import { FlashNewsStrip } from "@/components/market-intelligence/flash-news-strip";
import { OverviewNewsVisual } from "@/components/market-intelligence/overview-news-visual";
import { formatChange, formatPrice } from "@/lib/market-intelligence/format";
import { useMi } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { EnrichedMarketQuote, NewsEvent } from "@/lib/types/market";

interface MobileHomeHubProps {
  quotes: EnrichedMarketQuote[];
  breakingNews: NewsEvent[];
  unreadAlertCount: number;
  criticalAlertCount: number;
  oilMovePercent?: number;
}

function CardArrow() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05]">
      <ArrowRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
    </span>
  );
}

/** Mobile main: important news first, then oil + alerts shortcuts. */
export function MobileHomeHub({
  quotes,
  breakingNews,
  unreadAlertCount,
  criticalAlertCount,
  oilMovePercent = 0,
}: MobileHomeHubProps) {
  const t = useMi();
  const wti = quotes.find((quote) => quote.symbol === "WTI");
  const brent = quotes.find((quote) => quote.symbol === "BRENT");
  const oilQuotes = [wti, brent].filter(
    (quote): quote is EnrichedMarketQuote => Boolean(quote && quote.price > 0),
  );
  const strongestOilMove = oilQuotes.reduce(
    (strongest, quote) =>
      Math.abs(quote.percentageChange) > Math.abs(strongest)
        ? quote.percentageChange
        : strongest,
    0,
  );
  const oilHot =
    Math.abs(strongestOilMove) >= 0.75 ||
    oilQuotes.some((quote) => quote.volatilityStatus !== "NORMAL");

  return (
    <section className="space-y-3 md:hidden" aria-label={t.mobileOverviewAria}>
      <div className="px-1">
        <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200">
          {t.overviewShort}
        </p>
        <h2 className="mt-0.5 text-lg font-semibold text-white">
          {t.importantNewsFirst}
        </h2>
      </div>

      <OverviewNewsVisual events={breakingNews} />

      <FlashNewsStrip
        events={breakingNews}
        oilMovePercent={oilMovePercent}
        heading={t.flashHeadingMobile}
      />

      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/market-intelligence?view=oil"
          className="app-touch mobile-native-card min-w-0 rounded-[1.15rem] border border-orange-400/25 bg-gradient-to-br from-orange-500/15 to-[#101c29] p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/20 text-orange-200">
              <Flame className="h-[17px] w-[17px]" aria-hidden="true" />
            </span>
            <CardArrow />
          </div>
          <p className="mt-3 text-sm font-bold text-white">{t.oilShort}</p>
          <p
            className={cn(
              "mt-0.5 font-mono text-[9px] font-semibold uppercase",
              oilHot ? "text-orange-200" : "text-cyan-200",
            )}
          >
            {oilHot ? "HOT" : "WTI · Brent"}
          </p>
          <div className="mt-2 space-y-1">
            {[wti, brent].map((quote, index) => (
              <div
                key={quote?.symbol ?? index}
                className="flex items-baseline justify-between gap-1 font-mono text-[10px]"
              >
                <span className="text-slate-400">
                  {quote?.symbol ?? (index === 0 ? "WTI" : "BRENT")}
                </span>
                <span className="text-white">
                  {quote && quote.price > 0
                    ? formatPrice(quote.price, quote.symbol)
                    : "—"}
                </span>
                {quote && quote.price > 0 && (
                  <span
                    className={
                      quote.percentageChange >= 0
                        ? "text-emerald-300"
                        : "text-red-300"
                    }
                  >
                    {formatChange(quote.percentageChange, true)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Link>

        <Link
          href="/market-intelligence?view=oil&oilView=alerts"
          className="app-touch mobile-native-card min-w-0 rounded-[1.15rem] border border-red-300/20 bg-[#101c29]/95 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-400/12 text-red-200">
              <Bell className="h-[17px] w-[17px]" aria-hidden="true" />
            </span>
            {unreadAlertCount > 0 && (
              <span className="rounded-full bg-red-500/15 px-2 py-1 font-mono text-[9px] font-bold text-red-200">
                {unreadAlertCount}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm font-bold text-white">{t.alertsShort}</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">
            {criticalAlertCount > 0
              ? `${criticalAlertCount} ${t.criticalCount}`
              : unreadAlertCount > 0
                ? `${unreadAlertCount} ${t.unreadCountLabel}`
                : t.noOpenWarnings}
          </p>
        </Link>
      </div>

      <Link
        href="/market-intelligence?view=oil"
        className="app-touch mobile-native-card flex min-h-14 items-center gap-3 rounded-[1.15rem] border border-cyan-300/15 bg-[#101c29]/95 p-3"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-200">
          <Newspaper className="h-[19px] w-[19px]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{t.oilFlashShort}</p>
          <p className="truncate text-[11px] text-slate-400">
            {breakingNews.length} Flash · Iran · AJ · BBC · US
          </p>
        </div>
        <CardArrow />
      </Link>
    </section>
  );
}
