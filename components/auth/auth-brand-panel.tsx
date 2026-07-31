"use client";

import { Lock, ShieldCheck } from "lucide-react";
import { GlobalMarketClock } from "@/components/auth/global-market-clock";
import { useMi } from "@/components/i18n/locale-provider";

type AuthBrandPanelVariant = "login" | "signup";

interface AuthBrandPanelProps {
  variant?: AuthBrandPanelVariant;
}

/**
 * Full-bleed brand plane for the start page.
 * Brand first — AARYX is the hero, not an eyebrow.
 */
export function AuthBrandPanel({ variant = "signup" }: AuthBrandPanelProps) {
  const t = useMi();
  const isLogin = variant === "login";

  return (
    <aside className="relative flex h-full min-h-svh flex-col overflow-hidden px-10 pb-8 pt-10 text-white xl:px-16 xl:pb-10 xl:pt-12">
      <div
        className="aaryx-start-grid pointer-events-none absolute inset-0 opacity-30"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-24 top-[6%] h-72 w-72 rounded-full border border-orange-300/20"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-16 top-[11%] h-48 w-48 rounded-full border border-orange-300/15"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-32 bottom-[7%] h-72 w-72 rounded-full border border-cyan-300/15"
        aria-hidden="true"
      />
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="aaryx-start-rise pointer-events-none absolute left-0 top-0">
          <span className="font-[family-name:var(--font-landing-display)] text-[clamp(3.75rem,6vw,7rem)] font-extrabold leading-[0.88] tracking-[-0.06em] text-white">
            AARYX
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center py-6 xl:py-8">
          {isLogin ? (
            <div
              className="aaryx-start-rise"
              style={{ animationDelay: "140ms" }}
            >
              <h1 className="max-w-[58rem] text-[clamp(3.25rem,5.4vw,6rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-white">
                {t.readOilMoves}
                <span className="mt-2 block bg-gradient-to-r from-orange-300 via-orange-500 to-cyan-200 bg-clip-text text-transparent">
                  {t.beforeMarketReacts}
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-[clamp(1.05rem,1.55vw,1.45rem)] leading-relaxed text-slate-300">
                {t.wtiBrentGeoLine}
              </p>
            </div>
          ) : (
            <>
              <p
                className="aaryx-start-rise mt-6 max-w-md text-[1.35rem] font-semibold leading-snug tracking-[-0.02em] text-slate-100 sm:text-[1.55rem]"
                style={{ animationDelay: "140ms" }}
              >
                {t.accessTerminal}
              </p>
              <p
                className="aaryx-start-rise mt-4 max-w-sm text-[15px] leading-relaxed text-slate-400"
                style={{ animationDelay: "220ms" }}
              >
                {t.authInviteOnly}
              </p>
            </>
          )}

          <div
            className="aaryx-start-rise mt-8"
            style={{ animationDelay: "300ms" }}
          >
            <GlobalMarketClock variant="desktop" />
          </div>
        </div>

        <footer className="aaryx-start-rise mt-auto flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-300" aria-hidden="true" />
            {t.noInvestmentAdvice} · {t.noTradingSignals}
          </span>
          <span className="inline-flex items-center gap-2">
            <Lock className="h-5 w-5 text-slate-300" aria-hidden="true" />
            {t.authorizedUsers}
          </span>
        </footer>
      </div>
    </aside>
  );
}
