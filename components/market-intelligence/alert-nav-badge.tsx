"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { miDe } from "@/lib/market-intelligence/i18n/de";

interface AlertNavBadgeProps {
  count: number;
}

export function AlertNavBadge({ count }: AlertNavBadgeProps) {
  if (count <= 0) return null;

  return (
    <Link
      href="/market-intelligence#alert-center"
      className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white"
    >
      <Bell className="h-3.5 w-3.5" aria-hidden="true" />
      {miDe.navAlertsPrefix} {count}
    </Link>
  );
}
