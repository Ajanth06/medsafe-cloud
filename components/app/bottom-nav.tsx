"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/market-intelligence", label: "Terminal", icon: TrendingUp },
  { href: "/profile", label: "Konto", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-3 z-50 mx-auto w-[min(92%,26rem)] rounded-[1.4rem] border border-white/10 bg-[#0b1520]/95 p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.28)] backdrop-blur-xl"
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto flex items-stretch justify-around gap-1 pb-[max(0px,env(safe-area-inset-bottom))]">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[11px] font-semibold transition-all",
                active
                  ? "bg-gradient-to-r from-[#d24b2f] to-orange-500 text-white shadow-[0_8px_20px_rgba(210,75,47,0.3)]"
                  : "text-slate-400 hover:bg-white/10 hover:text-cyan-100",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
