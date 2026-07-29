import type {
  AlertSeverity,
  DeliveredAlert,
  IntelligenceEventCluster,
  MarketEvent,
  PipelineLatency,
} from "@/lib/types/market";

export type ReplayScenarioId =
  | "critical-oil-market-first"
  | "noise-unverified"
  | "material-update-confirmation"
  | "news-first-watch"
  | "retraction-correction";

export interface ReplayScenarioExpectations {
  minSeverity?: AlertSeverity;
  maxSeverity?: AlertSeverity;
  minAlerts?: number;
  maxAlerts?: number;
  expectAnomaly?: boolean;
  expectTelegramRoute?: boolean;
  expectUpdateAlert?: boolean;
  expectRetraction?: boolean;
  maxMarketToAlertMs?: number;
}

export interface ReplayScenarioDefinition {
  id: ReplayScenarioId;
  name: string;
  description: string;
  anchorIso: string;
  newsScenario: "market-first" | "news-first" | "unverified" | "retraction";
  /** Minute-level price deltas — same shape as mock-data */
  wtiChanges: number[];
  brentChanges: number[];
  wtiBase?: number;
  brentBase?: number;
  ticks?: number;
  expectations: ReplayScenarioExpectations;
}

export interface ReplayStageTiming {
  marketMoveStartedAt?: string;
  anomalyDetectedAt?: string;
  firstNewsAt?: string;
  verificationStatus?: string;
  aiCompletedAt?: string;
  alertQueuedAt?: string;
  alertSentAt?: string;
}

export interface ReplayValidationResult {
  scenarioId: ReplayScenarioId;
  passed: boolean;
  failures: string[];
  warnings: string[];
  metrics: ReplayMetrics;
  stages: ReplayStageTiming;
  marketEvents: MarketEvent[];
  clusters: IntelligenceEventCluster[];
  alerts: DeliveredAlert[];
}

export interface ReplayMetrics {
  marketToDetectionMs?: number;
  detectionToFirstNewsMs?: number;
  newsToAlertMs?: number;
  marketToAlertMs?: number;
  aiLatencyMs?: number;
  alertsGenerated: number;
  alertsSuppressed: number;
  anomalyDetected: boolean;
  clusterCount: number;
  highestSeverity?: AlertSeverity;
  falsePositive: boolean;
  missedEvent: boolean;
  latency: Partial<PipelineLatency>;
}

export interface ReplayRunResult {
  scenario: ReplayScenarioDefinition;
  validation: ReplayValidationResult;
  durationMs: number;
}
