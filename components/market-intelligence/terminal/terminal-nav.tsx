"use client";

import { miDe } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";
import {
  Activity,
  Bell,
  Droplets,
  LayoutDashboard,
  LineChart,
  Newspaper,
  Settings,
  Server,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export type TerminalView =
  | "overview"
  | "markets"
  | "oil"
  | "intelligence"
  | "alerts"
  | "operations"
  | "settings";

const VIEWS: { id: TerminalView; label: string; icon: typeof Activity }[] = [
  { id: "overview", label: miDe.navOverview, icon: LayoutDashboard },
  { id: "markets", label: miDe.navMarkets, icon: LineChart },
  { id: "oil", label: miDe.navOil, icon: Droplets },
  { id: "intelligence", label: miDe.navIntel, icon: Newspaper },
  { id: "alerts", label: miDe.navAlerts, icon: Bell },
  { id: "operations", label: miDe.navOps, icon: Server },
  { id: "settings", label: miDe.navSettings, icon: Settings },
];

interface TerminalNavProps {
  unreadCount?: number;
}

export function TerminalNav({ unreadCount = 0 }: TerminalNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = (searchParams.get("view") as TerminalView) || "overview";

  function setView(view: TerminalView) {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "overview") {
      params.delete("view");
    } else {
      params.set("view", view);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "/market-intelligence", { scroll: false });
  }

  return (
    <nav
      className="app-scroll flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-black/20 p-1 backdrop-blur-xl md:rounded-2xl md:p-1.5"
      aria-label="Terminal-Navigation"
    >
      {VIEWS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setView(id)}
          className={cn(
            "relative flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-semibold transition-all duration-200 hover:-translate-y-0.5 md:rounded-xl md:px-3 md:py-2.5 md:text-xs",
            active === id
              ? "bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-[0_8px_20px_rgba(249,115,22,0.25)]"
              : "text-slate-300 hover:bg-white/10 hover:text-white",
          )}
        >
          <Icon
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300",
              active === id && "scale-110",
            )}
            aria-hidden="true"
          />
          <span>{label}</span>
          {id === "alerts" && unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

export function useTerminalView(): TerminalView {
  const searchParams = useSearchParams();
  return (searchParams.get("view") as TerminalView) || "overview";
}
