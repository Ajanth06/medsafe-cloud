import type { AlertFingerprint } from "@/lib/types/market";

export function buildAlertFingerprint(input: AlertFingerprint): string {
  const parts = [
    input.eventId,
    input.severity,
    input.verification ?? "NONE",
    input.alertType,
    input.analysisVersion != null ? `v${input.analysisVersion}` : "v0",
  ];
  return parts.join("|");
}

export function parseAlertFingerprint(fingerprint: string): Partial<AlertFingerprint> {
  const [eventId, severity, verification, alertType, versionPart] = fingerprint.split("|");
  return {
    eventId,
    severity: severity as AlertFingerprint["severity"],
    verification: verification === "NONE" ? undefined : (verification as AlertFingerprint["verification"]),
    alertType: alertType as AlertFingerprint["alertType"],
    analysisVersion: versionPart?.startsWith("v") ? Number(versionPart.slice(1)) : undefined,
  };
}
