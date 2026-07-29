"use client";

import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "@/components/market-intelligence/severity-badge";
import { SourceVerificationBadge } from "@/components/market-intelligence/source-verification-badge";
import { formatTime } from "@/lib/market-intelligence/format";
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
  { id: "ACTIVE", label: "Active" },
  { id: "HIGH_PRIORITY", label: "High Priority" },
  { id: "ALL", label: "All" },
  { id: "RESOLVED", label: "Resolved" },
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
    return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700">Unread</span>;
  }
  if (status === "ACKNOWLEDGED") {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-600">Ack</span>;
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
          <h2 className="text-lg font-semibold text-foreground">AARYX Alert Center</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-muted">{unreadCount} unread alert{unreadCount !== 1 ? "s" : ""}</p>
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
                tab === t.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted">No alerts in this view.</CardContent>
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
                    Confidence: {alert.confidenceScore}/100 — {alert.confidence}
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
                  View event →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
