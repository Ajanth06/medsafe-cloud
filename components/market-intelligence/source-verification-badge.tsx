"use client";

import { useLabels } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { SourceVerificationStatus } from "@/lib/types/market";

const statusStyles: Record<SourceVerificationStatus, string> = {
  UNVERIFIED: "bg-slate-100 text-slate-500 border-slate-200",
  SINGLE_SOURCE: "bg-yellow-50 text-yellow-700 border-yellow-200",
  MULTIPLE_SOURCES: "bg-blue-50 text-blue-700 border-blue-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OFFICIAL_SOURCE: "bg-indigo-50 text-indigo-700 border-indigo-200",
  OFFICIAL_CONFIRMATION: "bg-indigo-50 text-indigo-800 border-indigo-300",
  CONFLICTING: "bg-red-50 text-red-700 border-red-200",
  RETRACTED: "bg-slate-100 text-slate-400 border-slate-200 line-through",
};

interface SourceVerificationBadgeProps {
  status: SourceVerificationStatus;
  sourceCount?: number;
  className?: string;
}

export function SourceVerificationBadge({
  status,
  sourceCount,
  className,
}: SourceVerificationBadgeProps) {
  const { tVerification } = useLabels();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        statusStyles[status],
        className,
      )}
    >
      {tVerification(status)}
      {sourceCount !== undefined && sourceCount > 0 && (
        <span className="font-normal normal-case">({sourceCount})</span>
      )}
    </span>
  );
}
