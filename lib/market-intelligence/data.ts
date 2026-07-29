import { getMarketIntelligenceDataFromStream } from "@/lib/market-intelligence/services/market-stream-service";

/**
 * Server-side data loader for Market Intelligence.
 * Uses centralized market stream service with real provider when configured.
 */
export async function getMarketIntelligenceData() {
  return getMarketIntelligenceDataFromStream();
}

export { createMarketDataProvider } from "@/lib/market-intelligence/providers/provider-factory";
export { DevelopmentMarketDataProvider } from "@/lib/market-intelligence/providers/development-market-data-provider";
