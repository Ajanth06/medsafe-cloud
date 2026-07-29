import { EventDetailView } from "@/components/market-intelligence/event-detail-view";
import { requireOnboardingComplete } from "@/lib/auth";
import { getMarketIntelligenceData } from "@/lib/market-intelligence/data";
import { getInAppAlerts } from "@/lib/market-intelligence/operations/in-app-alert-store";

interface EventPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function MarketIntelligenceEventPage({ params }: EventPageProps) {
  await requireOnboardingComplete();
  const { eventId } = await params;
  const data = await getMarketIntelligenceData();

  const alert =
    getInAppAlerts({ tab: "ALL" }).find((a) => a.eventId === eventId) ??
    getInAppAlerts({ tab: "ALL" }).find((a) => a.id === eventId);

  const cluster = data.intelligenceEvents.find((e) => e.id === eventId);
  const intelAlert = data.intelligenceAlerts.find((a) => a.id.includes(eventId));
  const marketEvent = data.marketEvents.find((e) => e.id === eventId);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <EventDetailView
        eventId={eventId}
        alert={alert}
        intelAlert={intelAlert}
        cluster={cluster}
        marketEvent={marketEvent}
      />
    </main>
  );
}
