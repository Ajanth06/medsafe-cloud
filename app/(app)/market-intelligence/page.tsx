import type { Metadata } from "next";
import { TerminalDashboard } from "@/components/market-intelligence/terminal/terminal-dashboard";
import { requireOnboardingComplete } from "@/lib/auth";
import { getMarketIntelligenceData } from "@/lib/market-intelligence/data";

export const metadata: Metadata = {
  title: "Market Intelligence",
  description:
    "Real-Time Market Monitoring & AI Event Analysis — separate module from healthcare data.",
};

export default async function MarketIntelligencePage() {
  await requireOnboardingComplete();
  const data = await getMarketIntelligenceData();

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <TerminalDashboard data={data} />
    </main>
  );
}
