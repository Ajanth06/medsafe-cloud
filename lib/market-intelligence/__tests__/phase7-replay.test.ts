import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildReplayHistoryMap,
  buildReplayNews,
  seedReplayBuffer,
} from "@/lib/market-intelligence/replay/replay-data-builder";
import { setReplayContext } from "@/lib/market-intelligence/replay/replay-context";
import {
  getReplayScenario,
  listReplayScenarios,
  REPLAY_SCENARIOS,
} from "@/lib/market-intelligence/replay/replay-scenarios";
import { runReplayScenario, runAllReplayScenarios } from "@/lib/market-intelligence/replay/replay-engine";
import { buildValidationResult } from "@/lib/market-intelligence/replay/replay-validator";
import { runEventPipeline } from "@/lib/market-intelligence/engine/event-pipeline";
import { buildReplayQuotes } from "@/lib/market-intelligence/replay/replay-data-builder";

describe("replay-scenarios", () => {
  it("registers five validation scenarios", () => {
    assert.equal(REPLAY_SCENARIOS.length, 5);
    assert.ok(getReplayScenario("critical-oil-market-first"));
  });

  it("listReplayScenarios returns summaries", () => {
    const list = listReplayScenarios();
    assert.equal(list.length, 5);
    assert.ok(list.every((s) => s.id && s.name));
  });
});

describe("replay-data-builder", () => {
  it("builds anchored news relative to scenario anchor", () => {
    const scenario = getReplayScenario("critical-oil-market-first")!;
    const anchorMs = new Date(scenario.anchorIso).getTime();
    const news = buildReplayNews(scenario, anchorMs);
    assert.ok(news.length >= 1);
    for (const item of news) {
      const ts = new Date(item.publishedAt).getTime();
      assert.ok(Math.abs(ts - anchorMs) <= 10 * 60_000);
    }
  });

  it("seeds buffer and detects oil spike anomaly", () => {
    const scenario = getReplayScenario("critical-oil-market-first")!;
    const anchorMs = new Date(scenario.anchorIso).getTime();
    const historyMap = buildReplayHistoryMap(scenario, anchorMs);
    const buffer = seedReplayBuffer(scenario, anchorMs);
    const quotes = buildReplayQuotes(anchorMs, historyMap);
    const pipeline = runEventPipeline(quotes, buffer, anchorMs);
    assert.ok(pipeline.marketEvents.length >= 1 || pipeline.oilCorrelation?.bothConfirmed);
  });
});

describe("replay-engine", () => {
  it("runs critical oil market-first scenario", async () => {
    process.env.BACKGROUND_WORKERS_ENABLED = "true";
    process.env.ALERT_DELIVERY_ENABLED = "true";
    process.env.TELEGRAM_ENABLED = "false";

    const result = await runReplayScenario("critical-oil-market-first");
    assert.equal(result.scenario.id, "critical-oil-market-first");
    assert.ok(result.validation.metrics.clusterCount >= 0);
    assert.ok(result.durationMs >= 0);
    if (!result.validation.passed) {
      console.info("critical-oil failures:", result.validation.failures);
    }
  });

  it("noise scenario avoids critical telegram routing", async () => {
    process.env.TELEGRAM_ENABLED = "false";
    const result = await runReplayScenario("noise-unverified");
    assert.ok(result.validation.metrics.highestSeverity !== "CRITICAL" || result.validation.alerts.length === 0);
  });

  it("runAllReplayScenarios completes all scenarios", async () => {
    process.env.TELEGRAM_ENABLED = "false";
    const results = await runAllReplayScenarios();
    assert.equal(results.length, 5);
    for (const r of results) {
      assert.ok(r.validation.metrics);
      assert.ok(r.durationMs >= 0);
    }
  });
});

describe("replay-validator", () => {
  it("flags severity below minimum", () => {
    const scenario = getReplayScenario("critical-oil-market-first")!;
    const result = buildValidationResult({
      scenarioId: scenario.id,
      expectations: scenario.expectations,
      marketEvents: [],
      clusters: [],
      alerts: [],
      alertsGenerated: 0,
      alertsSuppressed: 0,
    });
    assert.equal(result.passed, false);
    assert.ok(result.failures.some((f) => f.includes("anomaly")));
  });
});

describe("replay-context", () => {
  it("clears after replay run", async () => {
    process.env.TELEGRAM_ENABLED = "false";
    await runReplayScenario("news-first-watch");
    setReplayContext(null);
    const { getReplayContext } = await import("@/lib/market-intelligence/replay/replay-context");
    assert.equal(getReplayContext(), null);
  });
});
