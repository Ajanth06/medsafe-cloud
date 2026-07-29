import { getAIProviderConfig } from "@/lib/market-intelligence/config/ai-config";
import { DemoAIProvider, DeterministicAIProvider } from "@/lib/market-intelligence/providers/ai/deterministic-ai-provider";
import { createOpenAIProvider } from "@/lib/market-intelligence/providers/ai/openai-ai-provider";
import type { AIProvider } from "@/lib/market-intelligence/providers/ai/ai-provider-types";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";

export function createAIProvider(): AIProvider {
  const config = getAIProviderConfig();

  if (config.provider === "openai" && config.apiKey) {
    try {
      marketLogger.info("Using OpenAI AI provider", { model: config.model });
      return createOpenAIProvider();
    } catch (error) {
      marketLogger.warn("OpenAI provider init failed — using deterministic fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (config.provider === "demo" || !config.isConfigured) {
    return new DemoAIProvider();
  }

  return new DeterministicAIProvider();
}
