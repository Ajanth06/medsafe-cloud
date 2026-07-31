import type { Metadata } from "next";
import { TerminalDashboard } from "@/components/market-intelligence/terminal/terminal-dashboard";
import { miDe } from "@/lib/market-intelligence/i18n/de";
import { getMarketIntelligenceData } from "@/lib/market-intelligence/data";

export const metadata: Metadata = {
  title: miDe.terminalTitle,
  description: miDe.terminalSubtitle,
};

export default async function MarketIntelligencePage() {
  // Auth already handled by app layout — skip second Supabase round-trip
  const data = await getMarketIntelligenceData();

  return (
    <main className="mx-auto max-w-[1500px] px-2.5 pb-3 pt-2.5 sm:px-3 sm:py-3 md:px-6 md:py-6 lg:px-8">
      <TerminalDashboard data={data} />
    </main>
  );
}
