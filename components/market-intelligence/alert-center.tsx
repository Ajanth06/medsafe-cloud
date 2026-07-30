"use client";

import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "@/components/market-intelligence/severity-badge";
import { SourceVerificationBadge } from "@/components/market-intelligence/source-verification-badge";
import { formatTime } from "@/lib/market-intelligence/format";
import { miDe, tUnreadAlerts } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";
import type { AlertReadStatus, DeliveredAlert } from "@/lib/types/market";
import Link from "next/link";
import { useState } from "react";

interface AlertCenterProps {
  alerts: DeliveredAlert[];
  unreadCount?: number;
}

type Tab = "ACTIVE" | "HIGH_PRIORITY" | "ALL" | "RESOLVED";

const TABS: { id: Tab; label: string }[] = [
  { id: "ACTIVE", label: miDe.tabActive },
  { id: "HIGH_PRIORITY", label: miDe.tabHigh },
  { id: "ALL", label: miDe.tabAll },
  { id: "RESOLVED", label: miDe.tabResolved },
];

function filterAlerts(alerts: DeliveredAlert[], tab: Tab): DeliveredAlert[] {
  switch (tab) {
    case "ACTIVE":
      return alerts.filter((a) => a.eventStatus === "ACTIVE" || a.eventStatus === "MONITORING");
    case "HIGH_PRIORITY":
      return alerts.filter((a) => a.severity === "HIGH" || a.severity === "CRITICAL");
    case "RESOLVED":
      return alerts.filter((a) => a.eventStatus === "RESOLVED");
    default:
      return alerts;
  }
}

function ReadBadge({ status }: { status: AlertReadStatus }) {
  if (status === "UNREAD") {
    return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700">{miDe.unread}</span>;
  }
  if (status === "ACKNOWLEDGED") {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">{miDe.ack}</span>;
  }
  return null;
}

export function AlertCenter({ alerts, unreadCount = 0 }: AlertCenterProps) {
  const [tab, setTab] = useState<Tab>("ACTIVE");
  const filtered = filterAlerts(alerts, tab);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{miDe.alertCenter}</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-muted">{tUnreadAlerts(unreadCount)}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t.id
                  ? "bg-orange-400/15 text-orange-200 ring-1 ring-orange-300/25"
                  : "bg-white/[0.06] text-slate-300 hover:bg-white/10 hover:text-white",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted">{miDe.noAlerts}</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => (
            <Card key={alert.id} className={cn(alert.readStatus === "UNREAD" && "border-blue-200 bg-blue-50/30")}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={alert.severity} />
                    {alert.alertType !== "NEW" && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                        {alert.alertType}
                      </span>
                    )}
                    <ReadBadge status={alert.readStatus} />
                  </div>
                  <span className="font-mono text-xs text-muted">{formatTime(alert.createdAt)} CET</span>
                </div>

                <div>
                  <h3 className="font-medium text-foreground">{alert.title}</h3>
                  {alert.verification && (
                    <div className="mt-2">
                      <SourceVerificationBadge status={alert.verification} />
                    </div>
                  )}
                </div>

                {alert.affectedAssets.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {alert.affectedAssets.map((asset) => (
                      <span key={asset.symbol} className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs">
                        {asset.symbol} {asset.changePercent >= 0 ? "+" : ""}
                        {asset.changePercent.toFixed(1)}%
                      </span>
                    ))}
                  </div>
                )}

                {alert.confidenceScore != null && (
                  <p className="text-xs text-muted">
                    {miDe.confidenceLabel}: {alert.confidenceScore}/100 — {alert.confidence}
                  </p>
                )}

                {alert.materialChange && alert.materialChange.length > 0 && (
                  <ul className="list-inside list-disc text-xs text-muted">
                    {alert.materialChange.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                )}

                <Link
                  href={alert.deepLink.replace(/^https?:\/\/[^/]+/, "")}
                  className="inline-block text-xs font-medium text-blue-600 hover:underline"
                >
                  {miDe.viewEvent}
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
