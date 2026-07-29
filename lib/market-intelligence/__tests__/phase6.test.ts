import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { buildAlertFingerprint } from "@/lib/market-intelligence/operations/alert-fingerprint";
import {
  detectMaterialChange,
  isCooldownException,
  type EventAlertSnapshot,
} from "@/lib/market-intelligence/operations/material-change";
import {
  processAlertsForDelivery,
  resetAlertDeliveryState,
} from "@/lib/market-intelligence/operations/alert-delivery-engine";
import {
  resetInAppAlerts,
  getInAppAlerts,
  getUnreadAlertCount,
} from "@/lib/market-intelligence/operations/in-app-alert-store";
import {
  claimJob,
  completeJob,
  enqueueJob,
  failJob,
  getDeadLetterJobs,
  getJobs,
  resetJobQueue,
} from "@/lib/market-intelligence/operations/job-queue";
import { recordHeartbeat, getWorkerHeartbeats, resetHeartbeats } from "@/lib/market-intelligence/operations/heartbeat";
import { buildOperationsHealth, resetWatchdogState } from "@/lib/market-intelligence/operations/system-watchdog";
import { formatTelegramAlert, shouldRouteToChannel } from "@/lib/market-intelligence/operations/alert-formatter";
import type { IntelligenceAlert, IntelligenceEventCluster } from "@/lib/types/market";

function baseAlert(overrides: Partial<IntelligenceAlert> = {}): IntelligenceAlert {
  return {
    id: "alert-event-1",
    severity: "CRITICAL",
    title: "OIL MARKET EVENT",
    description: "WTI spike detected",
    verification: "MULTIPLE_SOURCES",
    confidence: "HIGH",
    confidenceScore: 85,
    status: "ACTIVE",
    affectedAssets: [
      { symbol: "WTI", name: "WTI Crude Oil", changePercent: 2.2 },
      { symbol: "BRENT", name: "Brent Crude Oil", changePercent: 2.0 },
    ],
    timestamps: { alertCreatedAt: new Date().toISOString() },
    ...overrides,
  };
}

function baseCluster(overrides: Partial<IntelligenceEventCluster> = {}): IntelligenceEventCluster {
  return {
    id: "event-1",
    eventType: "GEOPOLITICAL_CONFLICT",
    newsEventType: "GEOPOLITICAL",
    headline: "Regional supply risk",
    summary: "Multiple reports of supply disruption",
    state: "VERIFIED",
    verification: { status: "MULTIPLE_SOURCES", sourceCount: 3, sources: ["Reuters", "AP"], lastVerifiedAt: new Date().toISOString() },
    sources: [],
    independentSourceCount: 3,
    officialSourceCount: 0,
    firstReportAt: new Date().toISOString(),
    latestUpdateAt: new Date().toISOString(),
    potentiallyAffectedMarkets: ["WTI", "BRENT"],
    marketRelevance: { WTI: "HIGH", BRENT: "HIGH" },
    priority: "CRITICAL",
    priorityScore: 85,
    causality: "UNKNOWN",
    timestamps: {},
    ...overrides,
  } as IntelligenceEventCluster;
}

describe("alert-fingerprint", () => {
  it("builds stable fingerprint", () => {
    const fp = buildAlertFingerprint({
      eventId: "e1",
      severity: "CRITICAL",
      verification: "MULTIPLE_SOURCES",
      alertType: "NEW",
      analysisVersion: 1,
    });
    assert.match(fp, /e1\|CRITICAL\|MULTIPLE_SOURCES\|NEW\|v1/);
  });
});

describe("material-change", () => {
  it("detects official confirmation as material", () => {
    const prev: EventAlertSnapshot = {
      eventId: "e1",
      severity: "HIGH",
      verification: "SINGLE_SOURCE",
      confidenceScore: 58,
      wtiChange: 1.5,
      affectedAssets: ["WTI"],
    };
    const curr: EventAlertSnapshot = {
      eventId: "e1",
      severity: "HIGH",
      verification: "OFFICIAL_CONFIRMATION",
      confidenceScore: 82,
      wtiChange: 2.7,
      affectedAssets: ["WTI"],
    };
    const result = detectMaterialChange(prev, curr);
    assert.equal(result.isMaterial, true);
    assert.equal(result.alertType, "UPDATE");
    assert.ok(result.changes.some((c) => c.includes("Verification")));
    assert.ok(isCooldownException(result));
  });

  it("detects retraction", () => {
    const prev: EventAlertSnapshot = {
      eventId: "e1",
      severity: "HIGH",
      verification: "MULTIPLE_SOURCES",
      affectedAssets: ["WTI"],
    };
    const curr: EventAlertSnapshot = {
      eventId: "e1",
      severity: "HIGH",
      verification: "RETRACTED",
      affectedAssets: ["WTI"],
    };
    const result = detectMaterialChange(prev, curr);
    assert.equal(result.alertType, "RETRACTION");
  });

  it("ignores non-material noise", () => {
    const snap: EventAlertSnapshot = {
      eventId: "e1",
      severity: "LOW",
      verification: "UNVERIFIED",
      wtiChange: 0.3,
      affectedAssets: ["WTI"],
    };
    const result = detectMaterialChange(snap, snap);
    assert.equal(result.isMaterial, false);
  });
});

describe("alert-delivery", () => {
  beforeEach(() => {
    resetAlertDeliveryState();
    resetInAppAlerts();
    process.env.BACKGROUND_WORKERS_ENABLED = "true";
    process.env.ALERT_DELIVERY_ENABLED = "true";
    process.env.TELEGRAM_ENABLED = "false";
  });

  it("scenario 1: critical oil event — one in-app alert, no duplicates", async () => {
    const alert = baseAlert();
    const cluster = baseCluster();

    const r1 = await processAlertsForDelivery({ alerts: [alert], clusters: [cluster] });
    assert.equal(r1.delivered.length, 1);
    assert.equal(getInAppAlerts().length, 1);

    const r2 = await processAlertsForDelivery({ alerts: [alert], clusters: [cluster] });
    assert.equal(r2.delivered.length, 0);
    assert.equal(getInAppAlerts().length, 1);
  });

  it("scenario 2: material update sends update not duplicate original", async () => {
    const cluster = baseCluster();
    const alert1 = baseAlert({ verification: "SINGLE_SOURCE", severity: "HIGH", confidenceScore: 58 });
    await processAlertsForDelivery({ alerts: [alert1], clusters: [cluster] });

    const alert2 = baseAlert({
      verification: "OFFICIAL_CONFIRMATION",
      severity: "HIGH",
      confidenceScore: 82,
      affectedAssets: [
        { symbol: "WTI", name: "WTI", changePercent: 2.7 },
        { symbol: "BRENT", name: "Brent", changePercent: 2.0 },
      ],
    });
    const r2 = await processAlertsForDelivery({ alerts: [alert2], clusters: [cluster] });
    assert.equal(r2.delivered.length, 1);
    assert.equal(r2.delivered[0].alertType, "UPDATE");
    assert.equal(getInAppAlerts().length, 2);
  });

  it("scenario 3: noise — low severity suppressed from telegram routing", () => {
    assert.equal(shouldRouteToChannel("TELEGRAM", "LOW"), false);
    assert.equal(shouldRouteToChannel("TELEGRAM", "CRITICAL"), true);
    assert.equal(shouldRouteToChannel("IN_APP", "LOW"), true);
  });

  it("scenario 7: duplicate delivery is idempotent", async () => {
    const alert = baseAlert();
    const cluster = baseCluster();
    await processAlertsForDelivery({ alerts: [alert], clusters: [cluster] });
    await processAlertsForDelivery({ alerts: [alert], clusters: [cluster] });
    assert.equal(getInAppAlerts().length, 1);
  });
});

describe("job-queue", () => {
  beforeEach(() => resetJobQueue());

  it("claims and completes jobs", () => {
    const job = enqueueJob({ type: "ALERT_DELIVERY", idempotencyKey: "test-1" });
    const claimed = claimJob("ALERT_DELIVERY");
    assert.equal(claimed?.id, job.id);
    completeJob(job.id);
    assert.equal(claimed?.status, "COMPLETED");
  });

  it("retries then dead letters", () => {
    const job = enqueueJob({ type: "ALERT_DELIVERY" });
    for (let i = 0; i < 5; i++) {
      let claimed = claimJob("ALERT_DELIVERY");
      if (!claimed) {
        const pending = getJobs().find((j) => j.id === job.id);
        if (pending) {
          pending.status = "RETRYING";
          pending.nextRetryAt = new Date(0).toISOString();
        }
        claimed = claimJob("ALERT_DELIVERY");
      }
      if (claimed) failJob(claimed.id, "API down");
    }
    assert.ok(getDeadLetterJobs().length >= 1);
  });

  it("idempotent enqueue", () => {
    const j1 = enqueueJob({ type: "AI_ANALYSIS", idempotencyKey: "same-key" });
    const j2 = enqueueJob({ type: "AI_ANALYSIS", idempotencyKey: "same-key" });
    assert.equal(j1.id, j2.id);
  });
});

describe("heartbeat", () => {
  beforeEach(() => resetHeartbeats());

  it("records worker heartbeat", () => {
    recordHeartbeat("market-monitor", "market");
    const beats = getWorkerHeartbeats();
    assert.equal(beats.length, 1);
    assert.equal(beats[0].workerType, "market");
    assert.equal(beats[0].status, "ONLINE");
  });
});

describe("telegram-formatter", () => {
  it("formats compact critical alert", () => {
    const text = formatTelegramAlert({
      alert: baseAlert(),
      cluster: baseCluster(),
      alertType: "NEW",
      deepLink: "http://localhost:3003/market-intelligence/events/event-1",
    });
    assert.match(text, /AARYX — CRITICAL/);
    assert.match(text, /WTI/);
    assert.match(text, /Open AARYX/);
    assert.doesNotMatch(text, /BUY|SELL/i);
  });

  it("formats update alert", () => {
    const text = formatTelegramAlert({
      alert: baseAlert({ severity: "HIGH" }),
      alertType: "UPDATE",
      deepLink: "http://localhost:3003/market-intelligence/events/event-1",
      materialChanges: ["Verification: SINGLE_SOURCE → OFFICIAL_CONFIRMATION"],
      originalAlertTime: new Date(Date.now() - 240_000).toISOString(),
    });
    assert.match(text, /EVENT UPDATE/);
    assert.match(text, /OFFICIAL_CONFIRMATION/);
  });
});

describe("severity-escalation", () => {
  beforeEach(() => {
    resetAlertDeliveryState();
    resetInAppAlerts();
    process.env.BACKGROUND_WORKERS_ENABLED = "true";
    process.env.ALERT_DELIVERY_ENABLED = "true";
    process.env.TELEGRAM_ENABLED = "false";
  });

  it("escalation triggers new alert at higher severity", async () => {
    const cluster = baseCluster();
    await processAlertsForDelivery({
      alerts: [baseAlert({ severity: "MEDIUM" })],
      clusters: [cluster],
    });
    const r2 = await processAlertsForDelivery({
      alerts: [baseAlert({ severity: "CRITICAL" })],
      clusters: [cluster],
    });
    assert.equal(r2.delivered.length, 1);
    assert.equal(r2.delivered[0].severity, "CRITICAL");
  });
});

describe("cooldown", () => {
  beforeEach(() => {
    resetAlertDeliveryState();
    resetInAppAlerts();
    process.env.BACKGROUND_WORKERS_ENABLED = "true";
    process.env.ALERT_DELIVERY_ENABLED = "true";
    process.env.ALERT_COOLDOWN_MS = "300000";
    process.env.TELEGRAM_ENABLED = "false";
  });

  it("suppresses same severity within cooldown", async () => {
    const alert = baseAlert();
    const cluster = baseCluster();
    await processAlertsForDelivery({ alerts: [alert], clusters: [cluster] });

    const alert2 = baseAlert();
    const r2 = await processAlertsForDelivery({ alerts: [alert2], clusters: [cluster] });
    assert.equal(r2.delivered.length, 0);
  });
});

describe("persistence-config", () => {
  it("disables persistence without service role key", () => {
    const prev = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { isMiPersistenceEnabled } = require("@/lib/market-intelligence/persistence/config");
    assert.equal(isMiPersistenceEnabled(), false);
    if (prev) process.env.SUPABASE_SERVICE_ROLE_KEY = prev;
  });
});

describe("operations-health", () => {
  beforeEach(() => resetWatchdogState());

  it("builds operations health snapshot", () => {
    const health = buildOperationsHealth();
    assert.ok(health.marketMonitoring);
    assert.ok(health.hostingNote?.includes("Vercel"));
  });
});
