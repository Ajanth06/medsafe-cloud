import { getMiDb } from "@/lib/supabase/mi-db";
import {
  deliveredAlertToRow,
  deliveryToRow,
  rowToDeliveredAlert,
  timingMetricsToRow,
} from "@/lib/market-intelligence/persistence/mappers";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { AlertDeliveryRecord, DeliveredAlert, PipelineLatency } from "@/lib/types/market";

export async function persistDeliveredAlert(alert: DeliveredAlert): Promise<void> {
  const supabase = getMiDb();
  if (!supabase) return;

  const { error } = await supabase
    .from("mi_delivered_alerts")
    .upsert(deliveredAlertToRow(alert), { onConflict: "id" });

  if (error) marketLogger.warn("persist_alert_failed", { alertId: alert.id, error: error.message });
}

export async function updateDeliveredAlertReadStatus(
  alertId: string,
  readStatus: DeliveredAlert["readStatus"],
): Promise<void> {
  const supabase = getMiDb();
  if (!supabase) return;

  const { error } = await supabase
    .from("mi_delivered_alerts")
    .update({ read_status: readStatus, updated_at: new Date().toISOString() })
    .eq("id", alertId);

  if (error) marketLogger.warn("persist_alert_read_failed", { alertId, error: error.message });
}

export async function listDeliveredAlertsFromDb(limit = 100): Promise<DeliveredAlert[]> {
  const supabase = getMiDb();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("mi_delivered_alerts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row) => rowToDeliveredAlert(row as Record<string, unknown>));
}

export async function persistDeliveryRecord(record: AlertDeliveryRecord): Promise<void> {
  const supabase = getMiDb();
  if (!supabase) return;

  const { error } = await supabase.from("mi_alert_deliveries").upsert(deliveryToRow(record), { onConflict: "id" });
  if (error) marketLogger.warn("persist_delivery_failed", { deliveryId: record.id, error: error.message });
}

export async function listDeliveryRecordsFromDb(limit = 50): Promise<AlertDeliveryRecord[]> {
  const supabase = getMiDb();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("mi_alert_deliveries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((row) => ({
    id: String(row.id),
    alertId: String(row.alert_id),
    eventId: String(row.event_id),
    channel: row.channel as AlertDeliveryRecord["channel"],
    status: row.status as AlertDeliveryRecord["status"],
    messageVersion: Number(row.message_version ?? 0),
    createdAt: String(row.created_at),
    sentAt: row.sent_at ? String(row.sent_at) : undefined,
    deliveredAt: row.delivered_at ? String(row.delivered_at) : undefined,
    failedAt: row.failed_at ? String(row.failed_at) : undefined,
    attempts: Number(row.attempts ?? 0),
    error: row.error ? String(row.error) : undefined,
  }));
}

export async function persistEventTimingMetrics(input: {
  eventId: string;
  alertId?: string;
  latency: PipelineLatency;
}): Promise<void> {
  const supabase = getMiDb();
  if (!supabase) return;

  const id = `timing-${input.eventId}-${input.alertId ?? "event"}`;
  const { error } = await supabase.from("mi_event_timing_metrics").upsert(
    timingMetricsToRow({ id, ...input }),
    { onConflict: "id" },
  );

  if (error) marketLogger.warn("persist_timing_failed", { eventId: input.eventId, error: error.message });
}
