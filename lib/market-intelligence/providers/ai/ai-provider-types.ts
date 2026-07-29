import type { AIAnalysisContext } from "@/lib/market-intelligence/ai/ai-context-builder";
import type {
  AIAnalysisChangeSummary,
  AIAnalysisResult,
  IntelligenceEventCluster,
  MarketEvent,
} from "@/lib/types/market";

export interface AIProviderAnalyzeInput {
  context: AIAnalysisContext;
  cluster: IntelligenceEventCluster;
  marketEvent?: MarketEvent;
  previousAnalysis?: AIAnalysisResult;
  trigger: "INITIAL" | "UPDATE" | "MANUAL" | "REANALYZE";
}

export interface AIProviderAnalyzeResult {
  analysis: AIAnalysisResult;
  rawValid: boolean;
  validationError?: string;
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly mode: AIAnalysisResult["mode"];

  analyzeMarketEvent(input: AIProviderAnalyzeInput): Promise<AIProviderAnalyzeResult>;
  analyzeIntelligenceEvent(input: AIProviderAnalyzeInput): Promise<AIProviderAnalyzeResult>;
  updateExistingAnalysis(input: AIProviderAnalyzeInput): Promise<AIProviderAnalyzeResult>;
  summarizeConflictingReports(input: AIProviderAnalyzeInput): Promise<{ summary: string }>;
  classifyEvent(input: AIProviderAnalyzeInput): Promise<{ eventType: string; significance: string }>;
}

export type { AIAnalysisChangeSummary };
