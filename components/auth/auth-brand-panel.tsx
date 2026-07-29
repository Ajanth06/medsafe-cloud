import {
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { GlobalMarketClock } from "@/components/auth/global-market-clock";

type AuthBrandPanelVariant = "login" | "signup";

interface AuthBrandPanelProps {
  variant?: AuthBrandPanelVariant;
}

function BrandBackground() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 16% 14%, rgba(249,115,22,0.34), transparent 27%), radial-gradient(circle at 84% 78%, rgba(34,211,238,0.25), transparent 32%), linear-gradient(145deg, #111827 0%, #0b1520 55%, #07111a 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="absolute -left-16 top-[18%] h-52 w-52 rounded-full border border-orange-300/20" />
      <div className="absolute -left-8 top-[22%] h-36 w-36 rounded-full border border-orange-300/15" />
      <div className="absolute bottom-[10%] right-[8%] h-48 w-48 rounded-full border border-cyan-300/15" />
    </div>
  );
}

export function AuthBrandPanel({ variant = "signup" }: AuthBrandPanelProps) {
  const isLogin = variant === "login";

  return (
    <div className="relative flex h-full min-h-screen flex-col overflow-hidden bg-[#0a0f14] px-8 pb-5 pt-8 text-white lg:min-h-0 lg:px-12 lg:pb-8 lg:pt-10 xl:px-16">
      <BrandBackground />

      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-[0_10px_30px_rgba(249,115,22,0.3)]">
              <span className="font-mono text-[10px] font-black tracking-wider">AX</span>
            </span>
            <span className="font-mono text-sm font-bold tracking-[0.32em]">AARYX</span>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-cyan-200 backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
            Live
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <div className="mb-7 w-full max-w-lg">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-400/10 px-3 py-1.5 text-xs font-semibold text-orange-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Intelligence that moves with the market
            </div>
            <h1 className="text-[2.15rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white lg:text-[3.3rem]">
              {isLogin ? (
                <>
                  Märkte verstehen.
                  <span className="block bg-gradient-to-r from-orange-300 via-orange-400 to-cyan-300 bg-clip-text text-transparent">
                    Früher reagieren.
                  </span>
                </>
              ) : (
                "Zugang zum Terminal."
              )}
            </h1>
            <p className="mt-4 max-w-md text-base font-medium leading-relaxed text-slate-300 lg:text-lg">
              {isLogin
                ? "Öl, Makro und Geopolitik in einem lebendigen Intelligence-Terminal."
                : "Nur freigeschaltete Konten. Keine öffentliche Registrierung."}
            </p>
          </div>

          <GlobalMarketClock />
        </div>

        <footer className="mt-auto flex shrink-0 flex-wrap gap-x-5 gap-y-1 text-[10px] leading-relaxed text-slate-500 lg:text-[11px]">
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
            Keine Anlageberatung · Keine Handelsignale
          </p>
          <p className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
            Zugang nur für autorisierte Nutzer
          </p>
        </footer>
      </div>
    </div>
  );
}
