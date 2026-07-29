import { AI_PROMPT_VERSION, getAIProviderConfig } from "@/lib/market-intelligence/config/ai-config";
import { validateAIResponse } from "@/lib/market-intelligence/ai/ai-analysis-schema";
import {
  MARKET_ANALYSIS_SYSTEM_PROMPT,
  buildMarketAnalysisUserPrompt,
} from "@/lib/market-intelligence/ai/prompts/market-analysis-v1";
import { aiContextBuilder } from "@/lib/market-intelligence/ai/ai-context-builder";
import { DeterministicAIProvider } from "@/lib/market-intelligence/providers/ai/deterministic-ai-provider";
import type { AIProvider, AIProviderAnalyzeInput, AIProviderAnalyzeResult } from "@/lib/market-intelligence/providers/ai/ai-provider-types";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import { scoreToExtendedConfidence } from "@/lib/market-intelligence/config/ai-config";
import type { AIAnalysisResult, WatchItem } from "@/lib/types/market";
import { createHash } from "node:crypto";

export class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  readonly name = "OpenAI";
  readonly mode = "LIVE" as const;

  private fallback = new DeterministicAIProvider();

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly timeoutMs: number,
    private readonly maxRetries: number,
  ) {}

  async analyzeMarketEvent(input: AIProviderAnalyzeInput): Promise<AIProviderAnalyzeResult> {
    return this.callLLM(input);
  }

  async analyzeIntelligenceEvent(input: AIProviderAnalyzeInput): Promise<AIProviderAnalyzeResult> {
    return this.callLLM(input);
  }

  async updateExistingAnalysis(input: AIProviderAnalyzeInput): Promise<AIProviderAnalyzeResult> {
    return this.callLLM({ ...input, trigger: "UPDATE" });
  }

  async summarizeConflictingReports(input: AIProviderAnalyzeInput): Promise<{ summary: string }> {
    return this.fallback.summarizeConflictingReports(input);
  }

  async classifyEvent(input: AIProviderAnalyzeInput): Promise<{ eventType: string; significance: string }> {
    return this.fallback.classifyEvent(input);
  }

  private async callLLM(input: AIProviderAnalyzeInput): Promise<AIProviderAnalyzeResult> {
    const contextJson = aiContextBuilder.toPromptContext(input.context);
    const userPrompt = buildMarketAnalysisUserPrompt(contextJson);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.fetchCompletion(userPrompt);
        const parsed = JSON.parse(response.content) as unknown;
        const validation = validateAIResponse(parsed);

        if (!validation.success || !validation.data) {
          marketLogger.warn("AI response validation failed", { error: validation.error });
          if (attempt < this.maxRetries) continue;
          const fallback = await this.fallback.analyzeMarketEvent(input);
          fallback.analysis.mode = "FALLBACK";
          return fallback;
        }

        const analysis = mapResponseToAnalysis(validation.data, input, response.usage);
        return { analysis, rawValid: true };
      } catch (error) {
        marketLogger.warn("OpenAI analysis attempt failed", {
          attempt,
          error: error instanceof Error ? error.message : String(error),
        });
        if (attempt >= this.maxRetries) {
          const fallback = await this.fallback.analyzeMarketEvent(input);
          fallback.analysis.mode = "FALLBACK";
          return fallback;
        }
        await sleep(Math.min(1000 * 2 ** attempt, 8000));
      }
    }

    const fallback = await this.fallback.analyzeMarketEvent(input);
    return fallback;
  }

  private async fetchCompletion(userPrompt: string): Promise<{
    content: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: MARKET_ANALYSIS_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`OpenAI HTTP ${response.status}: ${body.slice(0, 200)}`);
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };

      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty OpenAI response");

      return { content, usage: data.usage };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function mapResponseToAnalysis(
  data: import("@/lib/market-intelligence/ai/ai-analysis-schema").AIProviderResponse,
  input: AIProviderAnalyzeInput,
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number },
): AIAnalysisResult {
  const { context, cluster, previousAnalysis } = input;
  const score = context.systemConfidence.score;
  const version = previousAnalysis ? previousAnalysis.version + 1 : 1;
  const now = new Date().toISOString();

  return {
    id: `ai-${cluster.id}-v${version}`,
    eventId: cluster.id,
    version,
    summary: data.summary,
    eventType: cluster.eventType,
    marketRegime: data.marketRegime,
    possibleCause: {
      description: data.possibleCauseDescription,
      causalityStatus: data.causalityStatus,
      supportingEvidence: context.evidence.filter((e) => e.type !== "MARKET"),
      contradictingEvidence: cluster.verification.status === "CONFLICTING" ? context.evidence : [],
    },
    alternativeExplanations: data.alternativeExplanations,
    affectedAssets: context.assetImpacts,
    impactAssessment: data.impactAssessment,
    confidence: scoreToExtendedConfidence(score),
    confidenceScore: score,
    confidenceReasons: context.systemConfidence.factors.map((f) => f.label),
    uncertaintyReasons: context.contradictionFlags,
    keyRisks: data.keyRisks,
    whatToWatchNext: data.whatToWatchNext as WatchItem[],
    marketAlreadyMoved: context.marketAlreadyMoved,
    moveAssessment: data.moveAssessment,
    reactionPhase: context.reactionPhase,
    sourceAssessment: data.sourceAssessment,
    eventSignificance: context.eventSignificance.level,
    facts: context.facts,
    interpretations: data.interpretations,
    evidence: context.evidence,
    generatedAt: now,
    model: getAIProviderConfig().model,
    promptVersion: AI_PROMPT_VERSION,
    mode: "LIVE",
    disclaimer: "AI-assisted market intelligence — not financial advice. No BUY/SELL signals.",
    metrics: {
      aiJobCreatedAt: now,
      aiCompletedAt: now,
      inputTokens: usage?.prompt_tokens,
      outputTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
      estimatedCost: estimateCost(usage),
      inputContextHash: createHash("sha256").update(JSON.stringify(context.facts)).digest("hex").slice(0, 16),
    },
  };
}

function estimateCost(usage?: { prompt_tokens?: number; completion_tokens?: number }): number | undefined {
  if (!usage?.prompt_tokens) return undefined;
  // gpt-4o-mini approximate: $0.15/1M input, $0.60/1M output
  const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15;
  const outputCost = ((usage.completion_tokens ?? 0) / 1_000_000) * 0.6;
  return Math.round((inputCost + outputCost) * 10000) / 10000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function createOpenAIProvider(): OpenAIProvider {
  const config = getAIProviderConfig();
  if (!config.apiKey) throw new Error("AI API key not configured");
  return new OpenAIProvider(config.apiKey, config.model, config.timeoutMs, config.maxRetries);
}
