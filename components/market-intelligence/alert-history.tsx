"use client";

import { SeverityBadge } from "@/components/market-intelligence/severity-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatChange, formatDateTime, formatPrice } from "@/lib/market-intelligence/format";
import { useMi } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { MarketAlert } from "@/lib/types/market";

interface AlertHistoryProps {
  alerts: MarketAlert[];
}

export function AlertHistory({ alerts }: AlertHistoryProps) {
  const t = useMi();

  return (
    <section aria-labelledby="alert-history-heading">
      <h2
        id="alert-history-heading"
        className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted"
      >
        {t.alertHistory}
      </h2>
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted">
              {t.noAlerts}
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => (
          <Card key={alert.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {alert.asset}
                </span>
                <span className="font-mono text-xs text-muted">{alert.symbol}</span>
                <SeverityBadge severity={alert.severity} />
                {alert.aiAssessmentCorrect !== null && (
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase",
                      alert.aiAssessmentCorrect
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700",
                    )}
                  >
                    KI {alert.aiAssessmentCorrect ? t.aiCorrect : t.aiIncorrect}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div>
                  <p className="text-muted">{t.triggered}</p>
                  <p className="font-mono font-medium">{formatDateTime(alert.triggeredAt)}</p>
                </div>
                <div>
                  <p className="text-muted">{t.alertPrice}</p>
                  <p className="font-mono font-medium">
                    {formatPrice(alert.alertPrice, alert.symbol)}
                  </p>
                </div>
                <div>
                  <p className="text-muted">{t.type}</p>
                  <p className="font-medium">{alert.eventType.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-muted">{t.aiAssessment}</p>
                  <p className="font-medium">
                    {alert.aiAssessmentCorrect === null
                      ? t.pendingValidation
                      : alert.aiAssessmentCorrect
                        ? t.validated
                        : t.missed}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {t.postAlertPerformance}
                </p>
                <div className="flex flex-wrap gap-2">
                  {alert.performanceSnapshots.map((snapshot) => (
                    <span
                      key={snapshot.minutesAfter}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-center",
                        snapshot.changePercent >= 0
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-red-200 bg-red-50",
                      )}
                    >
                      <span className="block text-[10px] text-muted">
                        +{snapshot.minutesAfter}m
                      </span>
                      <span
                        className={cn(
                          "block font-mono text-xs font-semibold",
                          snapshot.changePercent >= 0
                            ? "text-emerald-700"
                            : "text-red-700",
                        )}
                      >
                        {formatChange(snapshot.changePercent, true)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>
    </section>
  );
}
