"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Droplets, House, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/market-intelligence", label: "Übersicht", icon: House, view: "overview" },
  { href: "/market-intelligence?view=oil", label: "Öl", icon: Droplets, view: "oil" },
  { href: "/market-intelligence?view=settings", label: "Einstellungen", icon: Settings, view: "settings" },
] as const;

function normalizeView(raw: string | null): string {
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
  return raw ?? "overview";
}

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentView = normalizeView(searchParams.get("view"));

  // Only on Market Intelligence — avoid double bars elsewhere
  if (!pathname.startsWith("/market-intelligence")) {
    return null;
  }

  return (
    <nav
      className="mobile-bottom-nav fixed inset-x-0 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-50 mx-auto w-[min(calc(100%_-_1rem),27rem)] rounded-[1.35rem] border border-white/10 bg-[#08131e]/92 p-1.5 shadow-[0_18px_55px_rgba(0,0,0,0.42)] backdrop-blur-2xl xl:hidden"
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto flex items-stretch justify-around gap-1">
        {navItems.map(({ href, label, icon: Icon, view }) => {
          const active =
            pathname.startsWith("/market-intelligence") && currentView === view;

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "app-touch relative flex min-h-[3.25rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] px-1.5 py-1.5 text-[10px] font-semibold transition-all duration-200",
                active
                  ? "bg-orange-500/16 text-orange-100 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.16)]"
                  : "text-slate-300 hover:bg-white/10 hover:text-white",
              )}
            >
              {active && (
                <span className="absolute top-1 h-0.5 w-5 rounded-full bg-orange-400" />
              )}
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
