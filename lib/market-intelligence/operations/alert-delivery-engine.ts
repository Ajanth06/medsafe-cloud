import { getOperationsConfig } from "@/lib/market-intelligence/config/operations-config";
import { buildAlertFingerprint } from "@/lib/market-intelligence/operations/alert-fingerprint";
import {
  buildDeepLink,
  formatTelegramAlert,
  shouldRouteToChannel,
} from "@/lib/market-intelligence/operations/alert-formatter";
import { InAppAlertChannel } from "@/lib/market-intelligence/operations/channels/in-app-channel";
import { TelegramAlertChannel } from "@/lib/market-intelligence/operations/channels/telegram-channel";
import { WebPushAlertChannel } from "@/lib/market-intelligence/operations/channels/web-push-channel";
import {
  detectMaterialChange,
  isCooldownException,
  type EventAlertSnapshot,
} from "@/lib/market-intelligence/operations/material-change";
import { enqueueJob } from "@/lib/market-intelligence/operations/job-queue";
import { getAlertByEventId } from "@/lib/market-intelligence/operations/in-app-alert-store";
import { isMiPersistenceEnabled } from "@/lib/market-intelligence/persistence/config";
import {
  persistDeliveryRecord,
  persistEventTimingMetrics,
} from "@/lib/market-intelligence/persistence/alerts-repository";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type {
  AlertDeliveryRecord,
  DeliveredAlert,
  IntelligenceAlert,
  IntelligenceEventCluster,
  PipelineLatency,
} from "@/lib/types/market";

const eventSnapshots = new Map<string, EventAlertSnapshot>();
const deliveredFingerprints = new Set<string>();
const cooldownMap = new Map<string, number>();
const deliveryRecords: AlertDeliveryRecord[] = [];
const rateLimitWindow = new Map<string, number[]>();

let stats = {
  generated: 0,
  suppressed: 0,
  failed: 0,
};

let alertIdCounter = 0;
let recordIdCounter = 0;

function nextDeliveryAlertId(eventId: string): string {
  alertIdCounter += 1;
  return `alert-del-${eventId}-${alertIdCounter}`;
}

function nextDeliveryRecordId(): string {
  recordIdCounter += 1;
  return `delivery-${recordIdCounter}`;
}

function snapshotFromAlert(alert: IntelligenceAlert, cluster?: IntelligenceEventCluster): EventAlertSnapshot {
  const wti = alert.affectedAssets.find((a) => a.symbol === "WTI");
  const brent = alert.affectedAssets.find((a) => a.symbol === "BRENT");
  return {
    eventId: cluster?.id ?? alert.id.replace(/^alert-/, ""),
    severity: alert.severity,
    verification: alert.verification ?? cluster?.verification.status,
    confidenceScore: alert.confidenceScore,
    wtiChange: wti?.changePercent,
    brentChange: brent?.changePercent,
    analysisVersion: cluster?.analysisVersions?.length ?? cluster?.aiAnalysisResult ? 1 : 0,
    status: alert.status,
    affectedAssets: alert.affectedAssets.map((a) => a.symbol),
  };
}

function isRateLimited(key: string, maxPerWindow: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (rateLimitWindow.get(key) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= maxPerWindow) {
    rateLimitWindow.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  rateLimitWindow.set(key, timestamps);
  return false;
}

function recordDelivery(record: AlertDeliveryRecord): void {
  deliveryRecords.push(record);
  if (isMiPersistenceEnabled()) void persistDeliveryRecord(record);
}

export interface AlertDeliveryResult {
  delivered: DeliveredAlert[];
  suppressed: number;
  failed: number;
}

export async function processAlertsForDelivery(input: {
  alerts: IntelligenceAlert[];
  clusters?: IntelligenceEventCluster[];
  latency?: Partial<PipelineLatency>;
}): Promise<AlertDeliveryResult> {
  const config = getOperationsConfig();
  // In-app delivery must work without a background worker process
  if (!config.alertDeliveryEnabled) {
    return { delivered: [], suppressed: 0, failed: 0 };
  }

  const clusterMap = new Map((input.clusters ?? []).map((c) => [c.id, c]));
  const delivered: DeliveredAlert[] = [];

  for (const alert of input.alerts) {
    const eventId = alert.id.replace(/^alert-/, "");
    const cluster = [...clusterMap.values()].find(
      (c) => c.marketCorrelation?.marketEventId === eventId || c.id === eventId,
    ) ?? clusterMap.get(eventId);

    const resolvedEventId = cluster?.id ?? eventId;
    const currentSnapshot = snapshotFromAlert(alert, cluster);
    const previousSnapshot = eventSnapshots.get(resolvedEventId) ?? null;
    const materialChange = detectMaterialChange(previousSnapshot, currentSnapshot);

    if (!materialChange.isMaterial && previousSnapshot) {
      stats.suppressed += 1;
      marketLogger.info("alert_suppressed", { eventId: resolvedEventId, reason: "no_material_change" });
      continue;
    }

    const alertType = materialChange.alertType;
    const fingerprint = buildAlertFingerprint({
      eventId: resolvedEventId,
      severity: alert.severity,
      verification: currentSnapshot.verification,
      alertType,
      analysisVersion: currentSnapshot.analysisVersion,
    });

    if (deliveredFingerprints.has(fingerprint)) {
      stats.suppressed += 1;
      recordDelivery({
        id: nextDeliveryRecordId(),
        alertId: alert.id,
        eventId: resolvedEventId,
        channel: "IN_APP",
        status: "DEDUPLICATED",
        messageVersion: currentSnapshot.analysisVersion ?? 0,
        createdAt: new Date().toISOString(),
        attempts: 0,
      });
      marketLogger.info("alert_suppressed", { eventId: resolvedEventId, reason: "deduplicated" });
      continue;
    }

    const cooldownKey = `${resolvedEventId}:${alert.severity}`;
    const lastCooldown = cooldownMap.get(cooldownKey);
    if (
      lastCooldown &&
      Date.now() - lastCooldown < config.alertCooldownMs &&
      !isCooldownException(materialChange)
    ) {
      stats.suppressed += 1;
      marketLogger.info("alert_suppressed", { eventId: resolvedEventId, reason: "cooldown" });
      continue;
    }

    if (isRateLimited(`event:${resolvedEventId}`, 10, 60_000)) {
      stats.suppressed += 1;
      continue;
    }

    const deepLink = buildDeepLink(resolvedEventId);
    const originalAlert = getAlertByEventId(resolvedEventId);
    const body = formatTelegramAlert({
      alert,
      cluster,
      alertType,
      deepLink,
      materialChanges: materialChange.changes,
      originalAlertTime: originalAlert?.createdAt,
    });

    const now = new Date().toISOString();
    const deliveredAlert: DeliveredAlert = {
      id: nextDeliveryAlertId(resolvedEventId),
      eventId: resolvedEventId,
      intelligenceEventId: cluster?.id,
      severity: alert.severity,
      title: alertType === "UPDATE" ? `UPDATE: ${alert.title}` : alert.title,
      body,
      alertType,
      fingerprint,
      verification: alert.verification,
      confidence: alert.confidence,
      confidenceScore: alert.confidenceScore,
      affectedAssets: alert.affectedAssets,
      deepLink,
      readStatus: "UNREAD",
      eventStatus: alert.status,
      materialChange: materialChange.changes,
      createdAt: now,
      updatedAt: now,
      originalAlertId: originalAlert?.id,
      latency: {
        ...input.latency,
        alertQueuedAt: now,
      },
    };

    const channels = [
      new InAppAlertChannel(),
      new TelegramAlertChannel(),
      new WebPushAlertChannel(),
    ];

    let anySuccess = false;
    for (const channel of channels) {
      if (!shouldRouteToChannel(channel.type, alert.severity) && channel.type !== "IN_APP") continue;
      if (!channel.isEnabled() && channel.type !== "IN_APP") continue;

      const result = await channel.send(deliveredAlert);
      const record: AlertDeliveryRecord = {
        id: nextDeliveryRecordId(),
        alertId: deliveredAlert.id,
        eventId: resolvedEventId,
        channel: channel.type,
        status: result.status,
        messageVersion: currentSnapshot.analysisVersion ?? 0,
        createdAt: now,
        sentAt: result.success ? now : undefined,
        failedAt: result.success ? undefined : now,
        attempts: 1,
        error: result.error,
      };
      recordDelivery(record);

      if (result.success) anySuccess = true;
      else if (channel.type === "TELEGRAM") {
        stats.failed += 1;
        enqueueJob({
          type: "ALERT_DELIVERY",
          payload: { alertId: deliveredAlert.id, channel: "TELEGRAM" },
          idempotencyKey: `retry-${deliveredAlert.id}-TELEGRAM`,
        });
      }
    }

    if (anySuccess || alertType === "NEW") {
      deliveredFingerprints.add(fingerprint);
      cooldownMap.set(cooldownKey, Date.now());
      eventSnapshots.set(resolvedEventId, currentSnapshot);
      stats.generated += 1;
      deliveredAlert.latency = {
        ...deliveredAlert.latency,
        alertSentAt: new Date().toISOString(),
        marketToAlertMs:
          input.latency?.marketEventCreatedAt
            ? Date.now() - new Date(input.latency.marketEventCreatedAt).getTime()
            : undefined,
      };
      delivered.push(deliveredAlert);
      marketLogger.info("alert_created", { alertId: deliveredAlert.id, eventId: resolvedEventId, type: alertType });

      if (isMiPersistenceEnabled()) {
        void persistEventTimingMetrics({
          eventId: resolvedEventId,
          alertId: deliveredAlert.id,
          latency: deliveredAlert.latency ?? {},
        });
      }

      enqueueJob({
        type: "PERFORMANCE_SNAPSHOT",
        payload: { alertId: deliveredAlert.id, eventId: resolvedEventId, assets: currentSnapshot.affectedAssets },
        idempotencyKey: `snapshot-${deliveredAlert.id}`,
      });
    }
  }

  return { delivered, suppressed: stats.suppressed, failed: stats.failed };
}

export function getDeliveryStats() {
  return { ...stats };
}

export function getDeliveryRecords(limit = 50): AlertDeliveryRecord[] {
  return deliveryRecords.slice(-limit);
}

export function resetAlertDeliveryState(): void {
  eventSnapshots.clear();
  deliveredFingerprints.clear();
  cooldownMap.clear();
  deliveryRecords.length = 0;
  rateLimitWindow.clear();
  stats = { generated: 0, suppressed: 0, failed: 0 };
  recordIdCounter = 0;
  alertIdCounter = 0;
}

export function getEventSnapshot(eventId: string): EventAlertSnapshot | null {
  return eventSnapshots.get(eventId) ?? null;
}
