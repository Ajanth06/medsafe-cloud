import type {
  AlertDeliveryRecord,
  BackgroundJob,
  DeliveredAlert,
  PipelineLatency,
  WorkerHeartbeat,
} from "@/lib/types/market";

export function jobToRow(job: BackgroundJob) {
  return {
    id: job.id,
    job_type: job.type,
    status: job.status,
    payload: job.payload ?? {},
    idempotency_key: job.idempotencyKey ?? null,
    created_at: job.createdAt,
    queued_at: job.queuedAt ?? null,
    started_at: job.startedAt ?? null,
    completed_at: job.completedAt ?? null,
    attempts: job.attempts,
    last_error: job.lastError ?? null,
    next_retry_at: job.nextRetryAt ?? null,
  };
}

export function rowToJob(row: Record<string, unknown>): BackgroundJob {
  return {
    id: String(row.id),
    type: row.job_type as BackgroundJob["type"],
    status: row.status as BackgroundJob["status"],
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    queuedAt: row.queued_at ? String(row.queued_at) : undefined,
    startedAt: row.started_at ? String(row.started_at) : undefined,
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    attempts: Number(row.attempts ?? 0),
    lastError: row.last_error ? String(row.last_error) : undefined,
    nextRetryAt: row.next_retry_at ? String(row.next_retry_at) : undefined,
    idempotencyKey: row.idempotency_key ? String(row.idempotency_key) : undefined,
  };
}

export function heartbeatToRow(beat: WorkerHeartbeat) {
  return {
    worker_id: beat.workerId,
    worker_type: beat.workerType,
    last_beat_at: beat.lastBeatAt,
    status: beat.status,
    metadata: beat.metadata ?? {},
  };
}

export function rowToHeartbeat(row: Record<string, unknown>): WorkerHeartbeat {
  return {
    workerId: String(row.worker_id),
    workerType: String(row.worker_type),
    lastBeatAt: String(row.last_beat_at),
    status: row.status as WorkerHeartbeat["status"],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

export function deliveredAlertToRow(alert: DeliveredAlert) {
  return {
    id: alert.id,
    event_id: alert.eventId,
    intelligence_event_id: alert.intelligenceEventId ?? null,
    severity: alert.severity,
    title: alert.title,
    body: alert.body,
    alert_type: alert.alertType,
    fingerprint: alert.fingerprint,
    verification: alert.verification ?? null,
    confidence: alert.confidence ?? null,
    confidence_score: alert.confidenceScore ?? null,
    affected_assets: alert.affectedAssets,
    deep_link: alert.deepLink,
    read_status: alert.readStatus,
    event_status: alert.eventStatus,
    material_change: alert.materialChange ?? [],
    original_alert_id: alert.originalAlertId ?? null,
    latency: alert.latency ?? {},
    created_at: alert.createdAt,
    updated_at: alert.updatedAt,
  };
}

export function rowToDeliveredAlert(row: Record<string, unknown>): DeliveredAlert {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    intelligenceEventId: row.intelligence_event_id ? String(row.intelligence_event_id) : undefined,
    severity: row.severity as DeliveredAlert["severity"],
    title: String(row.title),
    body: String(row.body),
    alertType: row.alert_type as DeliveredAlert["alertType"],
    fingerprint: String(row.fingerprint),
    verification: row.verification as DeliveredAlert["verification"],
    confidence: row.confidence as DeliveredAlert["confidence"],
    confidenceScore: row.confidence_score != null ? Number(row.confidence_score) : undefined,
    affectedAssets: (row.affected_assets as DeliveredAlert["affectedAssets"]) ?? [],
    deepLink: String(row.deep_link),
    readStatus: row.read_status as DeliveredAlert["readStatus"],
    eventStatus: row.event_status as DeliveredAlert["eventStatus"],
    materialChange: (row.material_change as string[]) ?? [],
    originalAlertId: row.original_alert_id ? String(row.original_alert_id) : undefined,
    latency: (row.latency as PipelineLatency) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function deliveryToRow(record: AlertDeliveryRecord) {
  return {
    id: record.id,
    alert_id: record.alertId,
    event_id: record.eventId,
    channel: record.channel,
    status: record.status,
    message_version: record.messageVersion,
    created_at: record.createdAt,
    sent_at: record.sentAt ?? null,
    delivered_at: record.deliveredAt ?? null,
    failed_at: record.failedAt ?? null,
    attempts: record.attempts,
    error: record.error ?? null,
  };
}

export function timingMetricsToRow(input: {
  id: string;
  eventId: string;
  alertId?: string;
  latency: PipelineLatency;
}) {
  return {
    id: input.id,
    event_id: input.eventId,
    alert_id: input.alertId ?? null,
    market_move_started_at: input.latency.marketEventCreatedAt ?? null,
    anomaly_detected_at: input.latency.marketEventCreatedAt ?? null,
    ai_completed_at: input.latency.aiCompletedAt ?? null,
    alert_sent_at: input.latency.alertSentAt ?? null,
    market_to_alert_ms: input.latency.marketToAlertMs ?? null,
    news_to_alert_ms: input.latency.newsToAlertMs ?? null,
    ai_latency_ms: input.latency.aiLatencyMs ?? null,
    delivery_latency_ms: input.latency.deliveryLatencyMs ?? null,
    updated_at: new Date().toISOString(),
  };
}
