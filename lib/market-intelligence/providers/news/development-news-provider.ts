import type { NewsSearchAroundTimestampParams, NewsSearchParams } from "@/lib/market-intelligence/services/news-provider";
import { normalizeNewsItem } from "@/lib/market-intelligence/services/news-normalizer";
import type { NewsProvider } from "@/lib/market-intelligence/providers/news/news-provider-types";
import type { NormalizedNewsItem, NewsProviderHealthInfo } from "@/lib/types/market";

/** Demo news data for development — explicitly labeled DEMO, never LIVE. */
const DEMO_NEWS: NormalizedNewsItem[] = [
  {
    id: "demo-news-001",
    title: "Reports of military escalation in Gulf region",
    summary: "Multiple wire services report increased military activity near key energy shipping routes.",
    source: "Demo Wire",
    publishedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    categories: ["GEOPOLITICAL"],
    geopoliticalType: "MILITARY_STRIKE",
    entities: ["Iran", "Strait of Hormuz"],
    dataAvailability: "DEMO",
  },
  {
    id: "demo-news-002",
    title: "Independent media confirms Gulf region incident",
    summary: "Second independent outlet corroborates initial reports of escalation affecting energy markets.",
    source: "Demo Media",
    publishedAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    categories: ["GEOPOLITICAL"],
    geopoliticalType: "MILITARY_STRIKE",
    entities: ["Middle East", "Brent", "WTI"],
    dataAvailability: "DEMO",
  },
  {
    id: "demo-news-003",
    title: "US Department of Defense statement on regional security",
    summary: "Official statement acknowledges heightened security posture in the Middle East.",
    source: "US Department of Defense",
    publishedAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    categories: ["GEOPOLITICAL"],
    isOfficialSource: true,
    geopoliticalType: "MILITARY_STRIKE",
    entities: ["US", "Middle East"],
    dataAvailability: "DEMO",
  },
];

export class DevelopmentNewsProvider implements NewsProvider {
  readonly id = "development";
  readonly name = "Development Demo News Provider";

  private labelDemo(items: NormalizedNewsItem[]): NormalizedNewsItem[] {
    return items.map((item) =>
      normalizeNewsItem(
        {
          ...item,
          dataAvailability: "DEMO",
          title: item.title.includes("(DEMO)") ? item.title : `${item.title} (DEMO)`,
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
      error: "No live news provider configured — showing DEMO news",
    };
  }
}

/** Scenario-specific demo data for tests and historical replay */
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
        title: "Major shipping disruption reported in Strait of Hormuz (DEMO)",
        summary: "Breaking report of shipping disruption — markets not yet reacted.",
        source: "Demo Wire",
        publishedAt: new Date(base).toISOString(),
        categories: ["GEOPOLITICAL"],
        geopoliticalType: "STRAIT_DISRUPTION",
        dataAvailability: "DEMO",
      }];
    case "unverified":
      return [{
        id: "demo-social-rumor",
        title: "Unverified social media report of oil facility incident (DEMO)",
        summary: "Single unverified social media post — no confirmation.",
        source: "SocialMediaUser",
        publishedAt: new Date(base).toISOString(),
        categories: ["GEOPOLITICAL"],
        sourceType: "SOCIAL_MEDIA",
        dataAvailability: "DEMO",
      }];
    case "retraction":
      return [{
        id: "demo-retracted",
        title: "Initial report of attack retracted (DEMO)",
        summary: "Source retracts earlier report.",
        source: "Demo Wire",
        publishedAt: new Date(base).toISOString(),
        categories: ["GEOPOLITICAL"],
        isRetracted: true,
        dataAvailability: "DEMO",
      }];
  }
}
