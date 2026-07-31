"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Flame,
  LineChart,
  Newspaper,
} from "lucide-react";
import { formatChange, formatPrice } from "@/lib/market-intelligence/format";
import { cn } from "@/lib/utils";
import type { EnrichedMarketQuote, NewsEvent } from "@/lib/types/market";

interface MobileHomeHubProps {
  quotes: EnrichedMarketQuote[];
  breakingNews: NewsEvent[];
  unreadAlertCount: number;
  criticalAlertCount: number;
}

function CardArrow() {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.05]">
      <ArrowRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
    </span>
  );
}

export function MobileHomeHub({
  quotes,
  breakingNews,
  unreadAlertCount,
  criticalAlertCount,
}: MobileHomeHubProps) {
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
  const pressure =
    strongestOilMove >= 0.35
      ? "Aufwärtsdruck erhöht"
      : strongestOilMove <= -0.35
        ? "Abwärtsdruck erhöht"
        : "Marktlage neutral";
  const topMover = quotes
    .filter((quote) => quote.price > 0)
    .sort(
      (left, right) =>
        Math.abs(right.percentageChange) - Math.abs(left.percentageChange),
    )[0];
  const leadNews = breakingNews[0];

  return (
    <section className="space-y-3 md:hidden" aria-label="Mobile AARYX Übersicht">
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200">
            Deine Übersicht
          </p>
          <h2 className="mt-0.5 text-lg font-semibold text-white">
            Was ist jetzt wichtig?
          </h2>
        </div>
        <span className="text-[10px] text-slate-500">Tippen für Details</span>
      </div>

      <Link
        href="/market-intelligence?view=oil"
        className="app-touch block overflow-hidden rounded-[1.25rem] border border-orange-400/25 bg-gradient-to-br from-orange-500/15 via-[#101c29] to-cyan-500/10 p-3.5 shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/20 text-orange-200">
                <Flame className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">Öl Intelligence</p>
                <p
                  className={cn(
                    "font-mono text-[9px] font-semibold uppercase tracking-wider",
                    oilHot ? "text-orange-200" : "text-cyan-200",
                  )}
                >
                  {oilHot ? "HOT · erhöhte Bewegung" : pressure}
                </p>
              </div>
            </div>
          </div>
          <CardArrow />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {[wti, brent].map((quote, index) => (
            <div
              key={quote?.symbol ?? index}
              className="rounded-xl border border-white/8 bg-black/15 px-3 py-2"
            >
              <p className="font-mono text-[9px] uppercase text-slate-400">
                {quote?.symbol ?? (index === 0 ? "WTI" : "BRENT")}
              </p>
              <div className="mt-0.5 flex items-baseline justify-between gap-2">
                <p className="font-mono text-base font-bold text-white">
                  {quote && quote.price > 0
                    ? formatPrice(quote.price, quote.symbol)
                    : "—"}
                </p>
                {quote && quote.price > 0 && (
                  <p
                    className={cn(
                      "font-mono text-[10px] font-semibold",
                      quote.percentageChange >= 0
                        ? "text-emerald-300"
                        : "text-red-300",
                    )}
                  >
                    {formatChange(quote.percentageChange, true)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[9px] text-slate-500">
          Marktindikator, keine Prognose oder Anlageberatung.
        </p>
      </Link>

      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/market-intelligence?view=intelligence"
          className="app-touch min-w-0 rounded-[1.15rem] border border-orange-300/20 bg-[#101c29]/95 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-400/12 text-orange-200">
              <Newspaper className="h-[17px] w-[17px]" aria-hidden="true" />
            </span>
            <span className="rounded-full bg-orange-500/15 px-2 py-1 font-mono text-[9px] font-bold text-orange-200">
              {breakingNews.length}
            </span>
          </div>
          <p className="mt-3 text-sm font-bold text-white">News</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-400">
            {leadNews?.title ?? "Aktuell keine wichtige Meldung"}
          </p>
        </Link>

        <Link
          href="/market-intelligence?view=alerts"
          className="app-touch min-w-0 rounded-[1.15rem] border border-red-300/20 bg-[#101c29]/95 p-3"
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
          <p className="mt-3 text-sm font-bold text-white">Alerts</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">
            {criticalAlertCount > 0
              ? `${criticalAlertCount} kritisch · sofort prüfen`
              : unreadAlertCount > 0
                ? `${unreadAlertCount} ungelesen`
                : "Keine offenen Warnungen"}
          </p>
        </Link>
      </div>

      <Link
        href="/market-intelligence?view=markets"
        className="app-touch flex min-h-16 items-center gap-3 rounded-[1.15rem] border border-cyan-300/15 bg-[#101c29]/95 p-3"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-400/10 text-cyan-200">
          <LineChart className="h-[19px] w-[19px]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">Märkte</p>
          <p className="truncate text-[11px] text-slate-400">
            {topMover
              ? `${topMover.symbol} bewegt sich am stärksten · ${formatChange(
                  topMover.percentageChange,
                  true,
                )}`
              : "DAX · Gold · Bitcoin · EUR/USD"}
          </p>
        </div>
        <CardArrow />
      </Link>
    </section>
  );
}
