import { MATERIAL_CHANGE_THRESHOLDS } from "@/lib/market-intelligence/config/operations-config";
import type { AlertSeverity, SourceVerificationStatus } from "@/lib/types/market";

export interface EventAlertSnapshot {
  eventId: string;
  severity: AlertSeverity;
  verification?: SourceVerificationStatus;
  confidenceScore?: number;
  wtiChange?: number;
  brentChange?: number;
  analysisVersion?: number;
  status?: string;
  affectedAssets: string[];
}

export interface MaterialChangeResult {
  isMaterial: boolean;
  changes: string[];
  alertType: "NEW" | "UPDATE" | "RETRACTION" | "CONFLICT";
}

const VERIFICATION_RANK: Record<string, number> = {
  UNVERIFIED: 0,
  SINGLE_SOURCE: 1,
  MULTIPLE_SOURCES: 2,
  CONFIRMED: 3,
  OFFICIAL_SOURCE: 4,
  OFFICIAL_CONFIRMATION: 5,
  CONFLICTING: -1,
  RETRACTED: -2,
};

function severityRank(severity: AlertSeverity): number {
  const ranks: Record<AlertSeverity, number> = {
    INFO: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  };
  return ranks[severity];
}

export function detectMaterialChange(
  previous: EventAlertSnapshot | null,
  current: EventAlertSnapshot,
): MaterialChangeResult {
  if (!previous) {
    return { isMaterial: true, changes: ["Initial alert"], alertType: "NEW" };
  }

  if (current.verification === "RETRACTED") {
    return {
      isMaterial: true,
      changes: ["Event retracted"],
      alertType: "RETRACTION",
    };
  }

  if (current.verification === "CONFLICTING" && previous.verification !== "CONFLICTING") {
    return {
      isMaterial: true,
      changes: ["Conflicting reports detected"],
      alertType: "CONFLICT",
    };
  }

  const changes: string[] = [];

  const prevVer = previous.verification ?? "UNVERIFIED";
  const currVer = current.verification ?? "UNVERIFIED";
  if ((VERIFICATION_RANK[currVer] ?? 0) > (VERIFICATION_RANK[prevVer] ?? 0)) {
    changes.push(`Verification: ${prevVer} → ${currVer}`);
  }

  if (severityRank(current.severity) > severityRank(previous.severity)) {
    changes.push(`Severity: ${previous.severity} → ${current.severity}`);
  }

  if (
    previous.confidenceScore != null &&
    current.confidenceScore != null &&
    Math.abs(current.confidenceScore - previous.confidenceScore) >= MATERIAL_CHANGE_THRESHOLDS.confidenceDelta
  ) {
    changes.push(`Confidence: ${previous.confidenceScore} → ${current.confidenceScore}`);
  }

  if (
    previous.wtiChange != null &&
    current.wtiChange != null &&
    Math.abs(current.wtiChange - previous.wtiChange) >= MATERIAL_CHANGE_THRESHOLDS.priceChangeDelta
  ) {
    changes.push(`WTI: ${previous.wtiChange.toFixed(1)}% → ${current.wtiChange.toFixed(1)}%`);
  }

  if (
    previous.brentChange != null &&
    current.brentChange != null &&
    Math.abs(current.brentChange - previous.brentChange) >= MATERIAL_CHANGE_THRESHOLDS.priceChangeDelta
  ) {
    changes.push(`Brent: ${previous.brentChange.toFixed(1)}% → ${current.brentChange.toFixed(1)}%`);
  }

  const newAssets = current.affectedAssets.filter((a) => !previous.affectedAssets.includes(a));
  if (newAssets.length > 0) {
    changes.push(`New affected market: ${newAssets.join(", ")}`);
  }

  if (current.analysisVersion != null && current.analysisVersion !== previous.analysisVersion) {
    changes.push(`AI analysis updated (v${current.analysisVersion})`);
  }

  return {
    isMaterial: changes.length > 0,
    changes,
    alertType: changes.length > 0 ? "UPDATE" : "NEW",
  };
}

export function isCooldownException(change: MaterialChangeResult): boolean {
  return (
    change.alertType === "RETRACTION" ||
    change.alertType === "CONFLICT" ||
    change.changes.some(
      (c) =>
        c.includes("OFFICIAL_CONFIRMATION") ||
        c.includes("Severity:") ||
        c.startsWith("WTI:") ||
        c.startsWith("Brent:"),
    )
  );
}
