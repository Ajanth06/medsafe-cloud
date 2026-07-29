import type { AlertReadStatus, DeliveredAlert } from "@/lib/types/market";
import { isMiPersistenceEnabled } from "@/lib/market-intelligence/persistence/config";
import {
  persistDeliveredAlert,
  updateDeliveredAlertReadStatus,
} from "@/lib/market-intelligence/persistence/alerts-repository";

const alerts = new Map<string, DeliveredAlert>();
let alertCounter = 0;

function nextAlertId(): string {
  alertCounter += 1;
  return `delivered-${Date.now()}-${alertCounter}`;
}

export function addInAppAlert(alert: DeliveredAlert): DeliveredAlert {
  const stored = alerts.has(alert.id) ? alert : { ...alert, id: alert.id || nextAlertId() };
  alerts.set(stored.id, stored);
  if (isMiPersistenceEnabled()) void persistDeliveredAlert(stored);
  return stored;
}

export function getInAppAlerts(filter?: {
  tab?: "ACTIVE" | "HIGH_PRIORITY" | "ALL" | "RESOLVED";
  readStatus?: AlertReadStatus;
}): DeliveredAlert[] {
  let result = [...alerts.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (filter?.readStatus) {
    result = result.filter((a) => a.readStatus === filter.readStatus);
  }

  switch (filter?.tab) {
    case "ACTIVE":
      result = result.filter((a) => a.eventStatus === "ACTIVE" || a.eventStatus === "MONITORING");
      break;
    case "HIGH_PRIORITY":
      result = result.filter((a) => a.severity === "HIGH" || a.severity === "CRITICAL");
      break;
    case "RESOLVED":
      result = result.filter((a) => a.eventStatus === "RESOLVED");
      break;
    case "ALL":
    default:
      break;
  }

  return result;
}

export function getUnreadAlertCount(): number {
  return [...alerts.values()].filter(
    (a) => a.readStatus === "UNREAD" && (a.severity === "HIGH" || a.severity === "CRITICAL" || a.severity === "MEDIUM"),
  ).length;
}

export function acknowledgeAlert(alertId: string, status: AlertReadStatus = "ACKNOWLEDGED"): DeliveredAlert | null {
  const alert = alerts.get(alertId);
  if (!alert) return null;
  alert.readStatus = status;
  alert.updatedAt = new Date().toISOString();
  if (isMiPersistenceEnabled()) void updateDeliveredAlertReadStatus(alertId, status);
  return alert;
}

export function markAlertRead(alertId: string): DeliveredAlert | null {
  return acknowledgeAlert(alertId, "READ");
}

export function resetInAppAlerts(): void {
  alerts.clear();
  alertCounter = 0;
}

export function getAlertById(alertId: string): DeliveredAlert | null {
  return alerts.get(alertId) ?? null;
}

export function getAlertByEventId(eventId: string): DeliveredAlert | null {
  return [...alerts.values()].find((a) => a.eventId === eventId && a.alertType === "NEW") ?? null;
}
