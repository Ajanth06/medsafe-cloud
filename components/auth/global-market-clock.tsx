"use client";

import { useEffect, useState } from "react";
import { useLocale, useMi } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

const markets = [
  { city: "Berlin", country: "DE", timeZone: "Europe/Berlin", x: 51, y: 29 },
  { city: "Shanghai", country: "CN", timeZone: "Asia/Shanghai", x: 83, y: 41 },
  { city: "Chennai", country: "IN", timeZone: "Asia/Kolkata", x: 72, y: 58 },
  { city: "Dubai", country: "AE", timeZone: "Asia/Dubai", x: 63, y: 48 },
  { city: "Singapore", country: "SG", timeZone: "Asia/Singapore", x: 81, y: 67 },
  { city: "Tokyo", country: "JP", timeZone: "Asia/Tokyo", x: 92, y: 35 },
  { city: "New York", country: "US", timeZone: "America/New_York", x: 25, y: 37 },
  { city: "São Paulo", country: "BR", timeZone: "America/Sao_Paulo", x: 35, y: 64 },
] as const;

function getTimeParts(date: Date | null, timeZone: string, intlLocale: string) {
  if (!date) return { time: "--:--", seconds: "--" };

  const parts = new Intl.DateTimeFormat(intlLocale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "--";

  return {
    time: `${read("hour")}:${read("minute")}`,
    seconds: read("second"),
  };
}

interface GlobalMarketClockProps {
  variant?: "mobile" | "desktop";
}

/** Separate mobile and desktop world-market experiences for the start page. */
export function GlobalMarketClock({
  variant = "desktop",
}: GlobalMarketClockProps) {
  const t = useMi();
  const { locale } = useLocale();
  const intlLocale =
    locale === "ta" ? "ta-IN" : locale === "en" ? "en-GB" : "de-DE";
  const [now, setNow] = useState<Date | null>(null);
  const isMobile = variant === "mobile";
  const heading =
    locale === "de"
      ? "Globale Märkte"
      : locale === "ta"
        ? "உலக சந்தைகள்"
        : "Global markets";
  const clockLabel =
    locale === "de" ? "Marktuhren" : locale === "ta" ? "சந்தை நேரம்" : "Market clocks";

  useEffect(() => {
    const firstTick = window.setTimeout(() => setNow(new Date()), 0);
    const interval = window.setInterval(() => setNow(new Date()), 15_000);
    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section
      aria-label={t.globalMarketClocksAria}
      className={cn(
        "w-full",
        isMobile
          ? "max-w-none"
          : "max-w-[64rem] rounded-[2rem] border border-white/15 bg-[#172431]/90 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] xl:p-6",
      )}
    >
      <div className={cn("flex items-end justify-between gap-3", isMobile ? "mb-2.5" : "mb-5")}>
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300/85">
            {heading}
          </p>
          <p className={cn("mt-0.5 font-semibold text-slate-100", isMobile ? "text-sm" : "text-2xl")}>
            {clockLabel}
          </p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
            </span>
            Live
          </div>
          {!isMobile && (
            <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">
              08 Standorte
            </p>
          )}
        </div>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#060d14]/70 shadow-[0_18px_45px_rgba(0,0,0,0.24)]",
          isMobile ? "h-44" : "h-44 xl:h-48",
        )}
      >
        <div
          className="aaryx-start-grid absolute inset-0 opacity-40"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_76%_38%,rgba(34,211,238,0.10),transparent_30%),radial-gradient(circle_at_20%_42%,rgba(249,115,22,0.12),transparent_34%)]"
          aria-hidden="true"
        />
        <svg
          viewBox="0 0 100 80"
          className={cn("absolute inset-0 h-full w-full", isMobile ? "p-2" : "p-7")}
          aria-hidden="true"
        >
          <g fill="rgba(148,163,184,0.035)" stroke="rgba(148,163,184,0.32)" strokeWidth="0.65">
            <path d="M7 24 14 16l14-3 10 7-5 9-8 2-4 12-8-3-3-8Z" />
            <path d="m27 47 10 4 5 10-4 15-7-4-3-13-5-7Z" />
            <path d="m44 20 10-6 13 2 5 7 12 1 10 8-5 11-13 4-7 14-8-4-2-13-10-5-8-10Z" />
            <path d="m51 43 10 3 6 14-5 16-9-6-4-16Z" />
            <path d="m82 60 9 2 4 8-7 5-9-6Z" />
          </g>
          <g fill="none" stroke="rgba(251,146,60,0.18)" strokeWidth="0.35" strokeDasharray="1.4 1.5">
            <path d="M25 37 Q38 18 51 29 T83 41" />
            <path d="M25 37 Q46 52 63 48 T92 35" />
            <path d="M63 48 Q73 57 81 67" />
          </g>
          {markets.map((market, index) => (
            <g key={market.city}>
              <circle
                cx={market.x}
                cy={market.y}
                r={isMobile ? "3.2" : "2.8"}
                fill="none"
                stroke="#fb923c"
                strokeOpacity="0.35"
              >
                <animate
                  attributeName="r"
                  values="1.2;3.8;1.2"
                  dur={`${2.4 + index * 0.15}s`}
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke-opacity"
                  values="0.55;0;0.55"
                  dur={`${2.4 + index * 0.15}s`}
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx={market.x} cy={market.y} r="1.15" fill="#fdba74" />
            </g>
          ))}
        </svg>
        <div className="absolute bottom-2.5 left-3 rounded-full border border-white/10 bg-black/30 px-2 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-slate-400 backdrop-blur-md">
          24H Market Pulse
        </div>
      </div>

      <div
        className={cn(
          isMobile
            ? "app-horizontal-scroll -mx-5 mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-1"
            : "mt-4 grid grid-cols-4 gap-2.5",
        )}
      >
        {markets.map((market) => {
          const { time, seconds } = getTimeParts(now, market.timeZone, intlLocale);
          return (
            <div
              key={market.city}
              className={cn(
                "rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5",
                isMobile && "min-w-[7.2rem] shrink-0 snap-start",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-mono text-[8px] uppercase tracking-[0.1em] text-slate-400">
                  {market.city}
                </p>
                <span className="font-mono text-[7px] text-slate-600">
                  {market.country}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <p className="font-mono text-sm font-semibold tabular-nums text-slate-100">
                  {time}
                </p>
                <span className={cn("font-mono text-[9px] tabular-nums", ["CN", "JP", "AE", "BR"].includes(market.country) ? "text-orange-300" : "text-cyan-300")}>
                  {seconds}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
