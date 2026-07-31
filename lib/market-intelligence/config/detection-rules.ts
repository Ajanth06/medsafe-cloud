import type { AnomalyDetectionRule, TimeWindowMinutes } from "@/lib/types/market";

function oilRules(symbol: "WTI" | "BRENT", assetId: string, name: string): AnomalyDetectionRule[] {
  const windows: { window: TimeWindowMinutes; threshold: number; severity: AnomalyDetectionRule["severity"] }[] = [
    { window: 5, threshold: 0.8, severity: "MEDIUM" },
    { window: 10, threshold: 1.5, severity: "HIGH" },
    { window: 15, threshold: 2.0, severity: "CRITICAL" },
  ];

  return windows.flatMap(({ window, threshold, severity }) => [
    {
      id: `${assetId}-up-${window}m`,
      assetId,
      symbol,
      assetName: name,
      windowMinutes: window,
      thresholdPercent: threshold,
      severity,
      direction: "UP" as const,
      enabled: true,
    },
    {
      id: `${assetId}-down-${window}m`,
      assetId,
      symbol,
      assetName: name,
      windowMinutes: window,
      thresholdPercent: threshold,
      severity,
      direction: "DOWN" as const,
      enabled: true,
    },
  ]);
}

/** Oil-only anomaly rules. */
export const ANOMALY_DETECTION_RULES: AnomalyDetectionRule[] = [
  ...oilRules("WTI", "wti", "WTI Crude Oil"),
  ...oilRules("BRENT", "brent", "Brent Crude Oil"),
];

export const SUPPORTED_WINDOWS: TimeWindowMinutes[] = [1, 5, 10, 15, 30, 60];
