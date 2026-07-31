"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell, House, LineChart, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/market-intelligence", label: "Übersicht", icon: House, view: "overview" },
  { href: "/market-intelligence?view=markets", label: "Märkte", icon: LineChart, view: "markets" },
  { href: "/market-intelligence?view=intelligence", label: "News", icon: Newspaper, view: "intelligence" },
  { href: "/market-intelligence?view=alerts", label: "Alerts", icon: Bell, view: "alerts" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = searchParams.get("view") ?? "overview";

  return (
    <nav
      className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 mx-auto w-[min(92%,26rem)] rounded-[1.4rem] border border-white/10 bg-[#0b1520]/95 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl md:hidden"
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto flex items-stretch justify-around gap-1">
        {navItems.map(({ href, label, icon: Icon, view }) => {
          const normalizedView = currentView === "oil" ? "markets" : currentView;
          const active =
            pathname.startsWith("/market-intelligence") &&
            normalizedView === view;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "app-touch flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-1.5 text-[9px] font-semibold transition-all duration-200 hover:-translate-y-0.5",
                active
                  ? "bg-gradient-to-r from-orange-600 to-orange-400 text-white shadow-[0_8px_20px_rgba(249,115,22,0.3)]"
                  : "text-slate-300 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
