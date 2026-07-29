"use client";

import { useEffect, useState } from "react";

const markets = [
  { city: "Berlin", country: "DE", timeZone: "Europe/Berlin", x: 51, y: 29, tone: "cyan" },
  { city: "Shanghai", country: "CN", timeZone: "Asia/Shanghai", x: 83, y: 41, tone: "orange" },
  { city: "Chennai", country: "IN", timeZone: "Asia/Kolkata", x: 72, y: 59, tone: "cyan" },
  { city: "Dubai", country: "AE", timeZone: "Asia/Dubai", x: 63, y: 48, tone: "orange" },
  { city: "Singapore", country: "SG", timeZone: "Asia/Singapore", x: 81, y: 67, tone: "cyan" },
  { city: "Tokyo", country: "JP", timeZone: "Asia/Tokyo", x: 92, y: 35, tone: "orange" },
  { city: "New York", country: "US", timeZone: "America/New_York", x: 25, y: 37, tone: "cyan" },
  { city: "São Paulo", country: "BR", timeZone: "America/Sao_Paulo", x: 34, y: 69, tone: "orange" },
] as const;

function getTimeParts(date: Date | null, timeZone: string) {
  if (!date) return { time: "--:--", seconds: "--" };

  const parts = new Intl.DateTimeFormat("de-DE", {
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

export function GlobalMarketClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const firstTick = window.setTimeout(() => setNow(new Date()), 0);
    const interval = window.setInterval(() => setNow(new Date()), 1_000);

    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className="relative max-w-lg overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-cyan-300/70">
            Globale Märkte
          </p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-white">Marktuhren</h2>
        </div>
        <div className="text-right">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-widest text-cyan-200">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_10px_2px_rgba(103,232,249,0.7)]" />
            Live
          </span>
          <p className="mt-1.5 font-mono text-[8px] uppercase tracking-widest text-slate-500">
            08 Standorte
          </p>
        </div>
      </div>

      <div className="relative mb-3 h-28 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#07111a]/80">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "linear-gradient(rgba(103,232,249,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(103,232,249,0.12) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <svg
          viewBox="0 0 100 80"
          className="absolute inset-0 h-full w-full"
          aria-label="Leuchtende Weltkarte mit acht Marktstandorten"
          role="img"
        >
          <g fill="none" stroke="rgba(148,163,184,0.28)" strokeWidth="0.7">
            <path d="M7 24 14 16l14-3 10 7-5 9-8 2-4 12-8-3-3-8Z" />
            <path d="m27 47 10 4 5 10-4 15-7-4-3-13-5-7Z" />
            <path d="m44 20 10-6 13 2 5 7 12 1 10 8-5 11-13 4-7 14-8-4-2-13-10-5-8-10Z" />
            <path d="m51 43 10 3 6 14-5 16-9-6-4-16Z" />
            <path d="m82 60 9 2 4 8-7 5-9-6Z" />
          </g>

          <g fill="none" stroke="rgba(103,232,249,0.12)" strokeDasharray="1.5 1.5" strokeWidth="0.45">
            <path d="M25 37 51 29 63 48 83 41 92 35" />
            <path d="M34 69 63 48 72 59 81 67" />
          </g>

          {markets.map((market, index) => {
            const color = market.tone === "orange" ? "#fb923c" : "#67e8f9";
            return (
              <g key={market.city}>
                <circle
                  cx={market.x}
                  cy={market.y}
                  r="3.2"
                  fill="none"
                  stroke={color}
                  strokeOpacity="0.22"
                >
                  <animate
                    attributeName="r"
                    values="1.5;4.5;1.5"
                    dur={`${2.1 + index * 0.12}s`}
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="stroke-opacity"
                    values="0.65;0;0.65"
                    dur={`${2.1 + index * 0.12}s`}
                    repeatCount="indefinite"
                  />
                </circle>
                <circle
                  cx={market.x}
                  cy={market.y}
                  r="1.15"
                  fill={color}
                  style={{ filter: `drop-shadow(0 0 3px ${color})` }}
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {markets.map((market) => {
          const { time, seconds } = getTimeParts(now, market.timeZone);
          const isOrange = market.tone === "orange";

          return (
            <div
              key={market.city}
              className="rounded-xl border border-white/[0.07] bg-white/[0.045] px-2 py-2"
            >
              <div className="flex items-center justify-between gap-1">
                <p className="truncate text-[8px] font-bold uppercase tracking-wide text-slate-400">
                  {market.city}
                </p>
                <span className={isOrange ? "text-[7px] text-orange-300" : "text-[7px] text-cyan-300"}>
                  {market.country}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-[12px] font-bold tabular-nums text-white">
                  {time}
                </span>
                <span
                  className={
                    isOrange
                      ? "font-mono text-[8px] tabular-nums text-orange-300"
                      : "font-mono text-[8px] tabular-nums text-cyan-300"
                  }
                >
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
