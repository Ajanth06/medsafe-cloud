"use client";

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
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "markets", label: "Markets", icon: LineChart },
  { id: "oil", label: "Oil", icon: Droplets },
  { id: "intelligence", label: "Intel", icon: Newspaper },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "operations", label: "Ops", icon: Server },
  { id: "settings", label: "Settings", icon: Settings },
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
      className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1"
      aria-label="Terminal navigation"
    >
      {VIEWS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setView(id)}
          className={cn(
            "relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
            active === id
              ? "bg-slate-900 text-white"
              : "text-muted hover:bg-slate-100 hover:text-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{label}</span>
          {id === "alerts" && unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">
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
