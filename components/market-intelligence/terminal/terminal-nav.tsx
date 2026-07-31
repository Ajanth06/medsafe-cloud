"use client";

import { miDe } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";
import {
  Droplets,
  LayoutDashboard,
  Settings,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export type TerminalView =
  | "overview"
  | "oil"
  | "geo"
  | "ai"
  | "alerts"
  | "settings"
  // legacy aliases kept for old links
  | "news"
  | "markets"
  | "intelligence"
  | "operations";

const VIEWS: {
  id: Extract<TerminalView, "overview" | "oil" | "settings">;
  label: string;
  hint: string;
  icon: typeof LayoutDashboard;
}[] = [
  {
    id: "overview",
    label: miDe.navOverview,
    hint: "Wichtigstes zuerst",
    icon: LayoutDashboard,
  },
  {
    id: "oil",
    label: miDe.navOil,
    hint: "Preise · Flash · Alerts · KI",
    icon: Droplets,
  },
  {
    id: "settings",
    label: miDe.navSettings,
    hint: "Präferenzen",
    icon: Settings,
  },
];

function normalizeView(raw: string | null): (typeof VIEWS)[number]["id"] {
  if (
    raw === "geo" ||
    raw === "ai" ||
    raw === "alerts" ||
    raw === "intelligence" ||
    raw === "markets" ||
    raw === "news"
  ) {
    return "oil";
  }
  if (raw === "operations") return "settings";
  if (raw === "oil" || raw === "settings") {
    return raw;
  }
  return "overview";
}

interface TerminalNavProps {
  unreadCount?: number;
  /** Vertical rail for desktop right column */
  variant?: "side" | "mobile";
}

export function TerminalNav({
  unreadCount = 0,
  variant = "side",
}: TerminalNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = normalizeView(searchParams.get("view"));

  function setView(view: (typeof VIEWS)[number]["id"]) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("oilView");
    if (view === "overview") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "/market-intelligence", { scroll: false });
  }

  if (variant === "mobile") {
    return (
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0b1520]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl xl:hidden"
        aria-label="Mobile Navigation"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                "app-touch relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[9px] font-semibold",
                active === id
                  ? "bg-orange-400/15 text-orange-200"
                  : "text-slate-400",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
              {id === "oil" && unreadCount > 0 && (
                <span className="absolute right-2 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-orange-500 px-0.5 text-[8px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="space-y-1 rounded-2xl border border-white/10 bg-[#101c29]/95 p-2 backdrop-blur-xl"
      aria-label="Terminal-Navigation"
    >
      <p className="px-2.5 pb-1 pt-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Bereiche
      </p>
      {VIEWS.map(({ id, label, hint, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setView(id)}
          className={cn(
            "relative flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition",
            active === id
              ? "bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-[0_8px_20px_rgba(249,115,22,0.2)]"
              : "text-slate-300 hover:bg-white/8 hover:text-white",
          )}
        >
          <Icon
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0",
              active === id ? "text-white" : "text-slate-400",
            )}
            aria-hidden="true"
          />
          <span className="min-w-0">
            <span className="block text-xs font-semibold">{label}</span>
            <span
              className={cn(
                "mt-0.5 block text-[10px] leading-snug",
                active === id ? "text-white/80" : "text-slate-500",
              )}
            >
              {hint}
            </span>
          </span>
          {id === "oil" && unreadCount > 0 && (
            <span className="ml-auto rounded-full bg-white/20 px-1.5 py-0.5 font-mono text-[9px] font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

export function useTerminalView(): (typeof VIEWS)[number]["id"] {
  const searchParams = useSearchParams();
  return normalizeView(searchParams.get("view"));
}
