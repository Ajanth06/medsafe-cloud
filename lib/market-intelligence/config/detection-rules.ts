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

export const ANOMALY_DETECTION_RULES: AnomalyDetectionRule[] = [
  ...oilRules("WTI", "wti", "WTI Crude Oil"),
  ...oilRules("BRENT", "brent", "Brent Crude Oil"),
  {
    id: "gold-up-15m",
    assetId: "gold",
    symbol: "GOLD",
    assetName: "Gold",
    windowMinutes: 15,
    thresholdPercent: 1.0,
    severity: "MEDIUM",
    direction: "UP",
    enabled: true,
  },
  {
    id: "gold-down-15m",
    assetId: "gold",
    symbol: "GOLD",
    assetName: "Gold",
    windowMinutes: 15,
    thresholdPercent: 1.0,
    severity: "MEDIUM",
    direction: "DOWN",
    enabled: true,
  },
  {
    id: "ndx-down-10m",
    assetId: "ndx",
    symbol: "NDX",
    assetName: "NASDAQ 100",
    windowMinutes: 10,
    thresholdPercent: 1.5,
    severity: "HIGH",
    direction: "DOWN",
    enabled: true,
  },
  {
    id: "ndx-up-10m",
    assetId: "ndx",
    symbol: "NDX",
    assetName: "NASDAQ 100",
    windowMinutes: 10,
    thresholdPercent: 1.5,
    severity: "HIGH",
    direction: "UP",
    enabled: true,
  },
  {
    id: "btc-down-15m",
    assetId: "btc",
    symbol: "BTC",
    assetName: "Bitcoin",
    windowMinutes: 15,
    thresholdPercent: 3.0,
    severity: "CRITICAL",
    direction: "DOWN",
    enabled: true,
  },
  {
    id: "btc-up-15m",
    assetId: "btc",
    symbol: "BTC",
    assetName: "Bitcoin",
    windowMinutes: 15,
    thresholdPercent: 3.0,
    severity: "CRITICAL",
    direction: "UP",
    enabled: true,
  },
];

export const SUPPORTED_WINDOWS: TimeWindowMinutes[] = [1, 5, 10, 15, 30, 60];
