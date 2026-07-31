export interface AIProviderConfig {
  provider: string;
  apiKey: string | null;
  model: string;
  timeoutMs: number;
  maxRetries: number;
  debounceMs: number;
  isConfigured: boolean;
}

export const AI_PROMPT_VERSION = "market-analysis-v1";

export const AI_TRIGGER_THRESHOLDS = {
  minMarketSeverity: "HIGH" as const,
  minPriorityScore: 75,
  minEventSignificance: "MODERATE" as const,
};

export function getAIProviderConfig(): AIProviderConfig {
  const apiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY ?? null;
  const provider =
    process.env.AI_PROVIDER ??
    (apiKey ? "openai" : "deterministic");

  return {
    provider,
    apiKey,
    model: process.env.AI_MODEL ?? "gpt-4o-mini",
    timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 30_000),
    maxRetries: Number(process.env.AI_MAX_RETRIES ?? 2),
    debounceMs: Number(process.env.AI_DEBOUNCE_MS ?? 5_000),
    isConfigured: Boolean(apiKey && provider !== "deterministic" && provider !== "mock"),
  };
}

export function scoreToExtendedConfidence(score: number): import("@/lib/types/market").ExtendedConfidenceLevel {
  if (score >= 85) return "VERY_HIGH";
  if (score >= 70) return "HIGH";
  if (score >= 50) return "MEDIUM";
  if (score >= 30) return "LOW";
  return "VERY_LOW";
}
