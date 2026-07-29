import { SeverityBadge } from "@/components/market-intelligence/severity-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatChange, formatTime } from "@/lib/market-intelligence/format";
import { miDe, tEventStatus, tVerification } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";
import type { IntelligenceAlert } from "@/lib/types/market";

interface IntelligenceAlertsProps {
  alerts: IntelligenceAlert[];
}

export function IntelligenceAlerts({ alerts }: IntelligenceAlertsProps) {
  return (
    <section aria-labelledby="intelligence-alerts-heading">
      <h2
        id="intelligence-alerts-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted"
      >
        {miDe.activeAlerts}
      </h2>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <Card
            key={alert.id}
            className={cn(
              alert.severity === "CRITICAL" && "border-red-300 bg-red-50/30 ring-1 ring-red-200",
            )}
          >
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={alert.severity} />
                <span className="font-mono text-xs text-muted">
                  {alert.timestamps.alertCreatedAt
                    ? formatTime(alert.timestamps.alertCreatedAt)
                    : ""}{" "}
                  CET
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase">
                  {tEventStatus(alert.status)}
                </span>
              </div>

              <h3 className="text-base font-semibold text-foreground">{alert.title}</h3>
              <p className="text-sm text-muted">{alert.description}</p>

              {alert.possibleEvent && (
                <p className="text-sm">
                  <span className="font-medium text-foreground">{miDe.possibleEvent}:</span>{" "}
                  {alert.possibleEvent}
                </p>
              )}

              <div className="flex flex-wrap gap-3 text-xs">
                <span>
                  {miDe.verificationLabel}:{" "}
                  <span className="font-semibold uppercase">{alert.verification ? tVerification(alert.verification) : alert.verification}</span>
                </span>
                <span>
                  {miDe.confidenceLabel}:{" "}
                  <span className="font-semibold uppercase">{alert.confidence}</span> (
                  {alert.confidenceScore})
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {alert.affectedAssets.map((asset) => (
                  <span
                    key={asset.symbol}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 font-mono text-xs font-medium",
                      asset.changePercent >= 0
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700",
                    )}
                  >
                    {asset.name}: {formatChange(asset.changePercent, true)}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
