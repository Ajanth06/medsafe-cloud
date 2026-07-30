import type { Metadata } from "next";
import { TerminalDashboard } from "@/components/market-intelligence/terminal/terminal-dashboard";
import { miDe } from "@/lib/market-intelligence/i18n/de";
import { requireOnboardingComplete } from "@/lib/auth";
import { getMarketIntelligenceData } from "@/lib/market-intelligence/data";

export const metadata: Metadata = {
  title: miDe.terminalTitle,
  description: miDe.terminalSubtitle,
};

export default async function MarketIntelligencePage() {
  await requireOnboardingComplete();
  const data = await getMarketIntelligenceData();

  return (
    <main className="mx-auto max-w-[1500px] px-3 py-3 md:px-6 md:py-6 lg:px-8">
      <TerminalDashboard data={data} />
    </main>
  );
}
