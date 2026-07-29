import { getOperationsConfig, severityRank, shouldSendTelegram } from "@/lib/market-intelligence/config/operations-config";
import type {
  AlertSeverity,
  DeliveredAlert,
  IntelligenceAlert,
  IntelligenceEventCluster,
  SourceVerificationStatus,
} from "@/lib/types/market";

function formatTimeCet(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

function verificationLabel(status?: SourceVerificationStatus): string {
  if (!status) return "UNVERIFIED";
  return status.replace(/_/g, " ");
}

function assetLine(symbol: string, change?: number, window?: string): string {
  if (change == null) return `${symbol}\n—`;
  const sign = change >= 0 ? "+" : "";
  const windowLabel = window ? ` / ${window}` : "";
  return `${symbol}\n${sign}${change.toFixed(1)} %${windowLabel}`;
}

export function formatTelegramAlert(input: {
  alert: IntelligenceAlert;
  cluster?: IntelligenceEventCluster;
  alertType: DeliveredAlert["alertType"];
  deepLink: string;
  materialChanges?: string[];
  originalAlertTime?: string;
}): string {
  const { alert, cluster, alertType, deepLink, materialChanges, originalAlertTime } = input;
  const config = getOperationsConfig();
  const time = formatTimeCet(alert.timestamps.alertCreatedAt ?? new Date().toISOString());

  if (alertType === "RETRACTION") {
    return [
      `<b>AARYX CORRECTION</b>`,
      "",
      `Previous event: ${alert.title}`,
      `Status: RETRACTED`,
      "Reason: Original source withdrew report.",
      alert.confidenceScore != null ? `Confidence: reduced to ${alert.confidenceScore}/100` : "",
      "",
      `<a href="${deepLink}">Open AARYX</a>`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (alertType === "UPDATE") {
    return [
      `<b>AARYX EVENT UPDATE</b>`,
      "",
      originalAlertTime ? `Original Alert: ${formatTimeCet(originalAlertTime)} CET` : "",
      `UPDATE: ${time} CET`,
      "",
      ...(materialChanges ?? []).map((c) => `• ${c}`),
      alert.verification ? `Verification: ${verificationLabel(alert.verification)}` : "",
      alert.confidenceScore != null
        ? `Confidence: ${alert.confidenceScore}/100 — ${alert.confidence}`
        : "",
      "",
      `<a href="${deepLink}">Open AARYX</a>`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (alertType === "CONFLICT") {
    return [
      `<b>AARYX — CONFLICTING REPORTS</b>`,
      "",
      alert.title,
      `${time} CET`,
      "",
      "Confidence reduced.",
      "Event remains under investigation.",
      "",
      `<a href="${deepLink}">Open AARYX</a>`,
    ].join("\n");
  }

  const wti = alert.affectedAssets.find((a) => a.symbol === "WTI");
  const brent = alert.affectedAssets.find((a) => a.symbol === "BRENT");
  const gold = alert.affectedAssets.find((a) => a.symbol === "GOLD");

  const aiAssessment =
    cluster?.aiAnalysisResult?.marketRegime ??
    cluster?.aiAnalysis?.marketRegime ??
    cluster?.aiAnalysisResult?.summary?.slice(0, 80);

  const whatToWatch =
    cluster?.aiAnalysisResult?.whatToWatchNext?.slice(0, 3).map((w) => `• ${w.description}`) ?? [];

  const possibleCause =
    cluster?.aiAnalysisResult?.possibleCause?.description ??
    alert.possibleEvent ??
    cluster?.summary?.slice(0, 120);

  const lines = [
    `<b>AARYX — ${alert.severity}</b>`,
    "",
    alert.title,
    `${time} CET`,
    "",
    wti ? assetLine("WTI", wti.changePercent, "10m") : "",
    brent ? assetLine("Brent", brent.changePercent, "10m") : "",
    gold && !wti && !brent ? assetLine("Gold", gold.changePercent) : "",
    "",
    alert.verification ? `Verification:\n${verificationLabel(alert.verification)}` : "",
    aiAssessment ? `AI Assessment:\n${aiAssessment}` : "",
    alert.confidenceScore != null
      ? `Confidence:\n${alert.confidenceScore}/100 — ${alert.confidence}`
      : "",
    cluster?.aiAnalysisResult?.reactionPhase
      ? `Market Reaction:\n${cluster.aiAnalysisResult.reactionPhase.replace(/_/g, " ")}`
      : "",
    possibleCause ? `Possible Cause:\n${possibleCause}` : "",
    whatToWatch.length > 0 ? `What to Watch:\n${whatToWatch.join("\n")}` : "",
    "",
    `<a href="${deepLink}">Open AARYX</a>`,
  ];

  return lines.filter(Boolean).join("\n");
}

export function buildDeepLink(eventId: string): string {
  const config = getOperationsConfig();
  return `${config.siteUrl}/market-intelligence/events/${eventId}`;
}

export function shouldRouteToChannel(
  channel: "IN_APP" | "TELEGRAM" | "WEB_PUSH",
  severity: AlertSeverity,
): boolean {
  const config = getOperationsConfig();
  if (!config.alertDeliveryEnabled) return channel === "IN_APP";

  switch (channel) {
    case "IN_APP":
      return true;
    case "TELEGRAM":
      return shouldSendTelegram(severity);
    case "WEB_PUSH":
      return config.webPushEnabled && severityRank(severity) >= severityRank("HIGH");
    default:
      return false;
  }
}
