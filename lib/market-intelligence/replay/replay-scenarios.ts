import type { ReplayScenarioDefinition } from "@/lib/market-intelligence/replay/replay-types";

const OIL_SPIKE_CHANGES = Array(50)
  .fill(0)
  .map((_, i) => (i > 40 ? 0.08 + i * 0.02 : 0.01));

const FLAT_CHANGES = Array(50).fill(0.01);

const NOISE_CHANGES = Array(50)
  .fill(0)
  .map((_, i) => (i > 45 ? 0.02 : 0.005));

export const REPLAY_SCENARIOS: ReplayScenarioDefinition[] = [
  {
    id: "critical-oil-market-first",
    name: "Critical Oil — Market First",
    description:
      "WTI + Brent spike with multi-source geopolitical reports. Market leads news; expects HIGH/CRITICAL detection and alert.",
    anchorIso: "2026-01-15T03:13:00.000Z",
    newsScenario: "market-first",
    wtiChanges: OIL_SPIKE_CHANGES,
    brentChanges: OIL_SPIKE_CHANGES.map((c) => c * 0.9),
    expectations: {
      minSeverity: "HIGH",
      minAlerts: 1,
      maxAlerts: 2,
      expectAnomaly: true,
      expectTelegramRoute: true,
      maxMarketToAlertMs: 120_000,
    },
  },
  {
    id: "noise-unverified",
    name: "Noise — Unverified Social",
    description: "Small WTI move (+0.3%) with single unverified social report. Should not produce CRITICAL/Telegram alert.",
    anchorIso: "2026-01-15T14:00:00.000Z",
    newsScenario: "unverified",
    wtiChanges: NOISE_CHANGES,
    brentChanges: NOISE_CHANGES,
    expectations: {
      maxSeverity: "MEDIUM",
      maxAlerts: 1,
      expectAnomaly: false,
      expectTelegramRoute: false,
    },
  },
  {
    id: "material-update-confirmation",
    name: "Material Update — Official Confirmation",
    description:
      "Initial HIGH/SINGLE_SOURCE event followed by official confirmation tick. Expects UPDATE alert, not duplicate original.",
    anchorIso: "2026-02-01T08:30:00.000Z",
    newsScenario: "market-first",
    wtiChanges: OIL_SPIKE_CHANGES,
    brentChanges: OIL_SPIKE_CHANGES.map((c) => c * 0.85),
    ticks: 2,
    expectations: {
      minSeverity: "HIGH",
      minAlerts: 2,
      maxAlerts: 3,
      expectAnomaly: true,
      expectUpdateAlert: true,
    },
  },
  {
    id: "news-first-watch",
    name: "News First — Watch Mode",
    description: "Breaking news before significant market move. Intelligence cluster in watch mode.",
    anchorIso: "2026-03-10T12:00:00.000Z",
    newsScenario: "news-first",
    wtiChanges: FLAT_CHANGES,
    brentChanges: FLAT_CHANGES,
    expectations: {
      maxAlerts: 2,
      expectAnomaly: false,
    },
  },
  {
    id: "retraction-correction",
    name: "Retraction Correction",
    description: "Retracted initial report. Expects correction/retraction handling with reduced confidence.",
    anchorIso: "2026-04-05T16:45:00.000Z",
    newsScenario: "retraction",
    wtiChanges: OIL_SPIKE_CHANGES,
    brentChanges: OIL_SPIKE_CHANGES.map((c) => c * 0.9),
    expectations: {
      expectRetraction: true,
      maxAlerts: 2,
    },
  },
];

export function getReplayScenario(id: string): ReplayScenarioDefinition | undefined {
  return REPLAY_SCENARIOS.find((s) => s.id === id);
}

export function listReplayScenarios() {
  return REPLAY_SCENARIOS.map(({ id, name, description }) => ({ id, name, description }));
}
