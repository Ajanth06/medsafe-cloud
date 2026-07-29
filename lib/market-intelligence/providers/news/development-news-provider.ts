import type { NewsSearchAroundTimestampParams, NewsSearchParams } from "@/lib/market-intelligence/services/news-provider";
import { normalizeNewsItem } from "@/lib/market-intelligence/services/news-normalizer";
import type { NewsProvider } from "@/lib/market-intelligence/providers/news/news-provider-types";
import type { NormalizedNewsItem, NewsProviderHealthInfo } from "@/lib/types/market";

/** Demo-News für Entwicklung — explizit als DEMO markiert, nie LIVE. */
const DEMO_NEWS: NormalizedNewsItem[] = [
  {
    id: "demo-news-001",
    title: "Berichte über militärische Eskalation im Golfraum",
    summary:
      "Mehrere Nachrichtenagenturen berichten über verstärkte Militäraktivität nahe wichtiger Energie-Schifffahrtsrouten.",
    source: "Demo Wire",
    publishedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    categories: ["GEOPOLITICAL"],
    geopoliticalType: "MILITARY_STRIKE",
    entities: ["Iran", "Straße von Hormus"],
    dataAvailability: "DEMO",
  },
  {
    id: "demo-news-002",
    title: "Unabhängige Medien bestätigen Vorfall im Golfraum",
    summary:
      "Ein zweites unabhängiges Medium bestätigt erste Berichte über Eskalation mit Auswirkungen auf Energiemärkte.",
    source: "Demo Media",
    publishedAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    categories: ["GEOPOLITICAL"],
    geopoliticalType: "MILITARY_STRIKE",
    entities: ["Naher Osten", "Brent", "WTI"],
    dataAvailability: "DEMO",
  },
  {
    id: "demo-news-003",
    title: "US-Verteidigungsministerium zu regionaler Sicherheit",
    summary:
      "Offizielle Stellungnahme bestätigt erhöhte Sicherheitslage im Nahen Osten.",
    source: "US Department of Defense",
    publishedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    categories: ["GEOPOLITICAL"],
    isOfficialSource: true,
    geopoliticalType: "MILITARY_STRIKE",
    entities: ["USA", "Naher Osten"],
    dataAvailability: "DEMO",
  },
];

export class DevelopmentNewsProvider implements NewsProvider {
  readonly id = "development";
  readonly name = "Entwicklungs-Demo-News";

  private labelDemo(items: NormalizedNewsItem[]): NormalizedNewsItem[] {
    return items.map((item) =>
      normalizeNewsItem(
        {
          ...item,
          dataAvailability: "DEMO",
          title: item.title.includes("(Demo)") ? item.title : `${item.title} (Demo)`,
        },
        this.id,
      ),
    );
  }

  async searchLatest(params?: NewsSearchParams): Promise<NormalizedNewsItem[]> {
    return this.labelDemo(DEMO_NEWS.slice(0, params?.limit ?? 10));
  }

  async searchByKeywords(keywords: string[], params?: NewsSearchParams): Promise<NormalizedNewsItem[]> {
    const lower = keywords.map((k) => k.toLowerCase());
    const matched = DEMO_NEWS.filter((item) => {
      const text = `${item.title} ${item.summary}`.toLowerCase();
      return lower.some((k) => text.includes(k));
    });
    return this.labelDemo(matched.slice(0, params?.limit ?? 10));
  }

  async searchAroundTimestamp(params: NewsSearchAroundTimestampParams): Promise<NormalizedNewsItem[]> {
    const center = new Date(params.timestamp).getTime();
    const beforeMs = (params.beforeMinutes ?? 30) * 60_000;
    const afterMs = (params.afterMinutes ?? 20) * 60_000;

    const matched = DEMO_NEWS.filter((item) => {
      const ts = new Date(item.publishedAt).getTime();
      return ts >= center - beforeMs && ts <= center + afterMs;
    });

    if (params.keywords?.length) {
      return this.searchByKeywords(params.keywords, { ...params, limit: params.limit });
    }

    return this.labelDemo(matched.slice(0, params.limit ?? 10));
  }

  async getBreakingNews(limit = 5): Promise<NormalizedNewsItem[]> {
    return this.labelDemo(DEMO_NEWS.slice(0, limit));
  }

  async getProviderHealth(): Promise<NewsProviderHealthInfo> {
    return {
      providerId: this.id,
      status: "OFFLINE",
      lastUpdate: new Date().toISOString(),
      error: "Kein Live-News-Provider — Demo-News werden angezeigt",
    };
  }
}

/** Szenario-Demo-Daten für Tests und historisches Replay */
export function getDemoNewsScenario(
  scenario: "market-first" | "news-first" | "unverified" | "retraction",
  anchorMs: number = Date.now(),
): NormalizedNewsItem[] {
  const base = anchorMs;
  switch (scenario) {
    case "market-first":
      return DEMO_NEWS.map((n, i) => ({
        ...n,
        publishedAt: new Date(base - (3 - i) * 60_000).toISOString(),
        dataAvailability: "DEMO" as const,
      }));
    case "news-first":
      return [{
        id: "demo-news-first",
        title: "Große Schifffahrtsstörung in der Straße von Hormus gemeldet (Demo)",
        summary: "Eilmeldung zu Schifffahrtsstörung — Märkte haben noch nicht reagiert.",
        source: "Demo Wire",
        publishedAt: new Date(base).toISOString(),
        categories: ["GEOPOLITICAL"],
        geopoliticalType: "STRAIT_DISRUPTION",
        dataAvailability: "DEMO",
      }];
    case "unverified":
      return [{
        id: "demo-social-rumor",
        title: "Unbestätigter Social-Media-Bericht über Ölanlagen-Vorfall (Demo)",
        summary: "Einzelner unbestätigter Social-Media-Post — keine Bestätigung.",
        source: "SocialMediaUser",
        publishedAt: new Date(base).toISOString(),
        categories: ["GEOPOLITICAL"],
        sourceType: "SOCIAL_MEDIA",
        dataAvailability: "DEMO",
      }];
    case "retraction":
      return [{
        id: "demo-retracted",
        title: "Erster Angriffsbericht zurückgezogen (Demo)",
        summary: "Quelle zieht früheren Bericht zurück.",
        source: "Demo Wire",
        publishedAt: new Date(base).toISOString(),
        categories: ["GEOPOLITICAL"],
        isRetracted: true,
        dataAvailability: "DEMO",
      }];
  }
}
