import type { SourceType } from "@/lib/types/market";

export interface OilRssFeed {
  id: string;
  name: string;
  url: string;
  sourceType: SourceType;
  /** Soft weight for ranking flash items */
  weight: number;
}

/**
 * Free public RSS feeds for oil / energy / geopolitics.
 * Title + summary + link only — no full-article scraping.
 */
export const OIL_RSS_FEEDS: OilRssFeed[] = [
  {
    id: "google-oil",
    name: "Google News (Oil)",
    url: "https://news.google.com/rss/search?q=oil+OR+WTI+OR+Brent+OR+OPEC+OR+crude&hl=en&gl=US&ceid=US:en",
    sourceType: "MAJOR_MEDIA",
    weight: 70,
  },
  {
    id: "google-iran-oil",
    name: "Google News (Iran/Energy)",
    url: "https://news.google.com/rss/search?q=Iran+(oil+OR+Hormuz+OR+sanctions+OR+crude)&hl=en&gl=US&ceid=US:en",
    sourceType: "MAJOR_MEDIA",
    weight: 85,
  },
  {
    id: "google-oil-de",
    name: "Google News DE (Öl)",
    url: "https://news.google.com/rss/search?q=%C3%96l+OR+Roh%C3%B6l+OR+OPEC+OR+Iran&hl=de&gl=DE&ceid=DE:de",
    sourceType: "MAJOR_MEDIA",
    weight: 72,
  },
  {
    id: "eia",
    name: "EIA",
    url: "https://www.eia.gov/rss/todayinenergy.xml",
    sourceType: "OFFICIAL_ENERGY",
    weight: 90,
  },
  {
    id: "bbc-business",
    name: "BBC Business",
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    sourceType: "MAJOR_MEDIA",
    weight: 75,
  },
  {
    id: "aljazeera",
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    sourceType: "MAJOR_MEDIA",
    weight: 80,
  },
  {
    id: "fed",
    name: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
    sourceType: "OFFICIAL_CENTRAL_BANK",
    weight: 70,
  },
];

/** Keywords that make an item oil-flash relevant */
export const OIL_FLASH_KEYWORDS = [
  "oil",
  "crude",
  "wti",
  "brent",
  "opec",
  "iran",
  "hormuz",
  "pipeline",
  "refinery",
  "tanker",
  "sanctions",
  "saudi",
  "iraq",
  "libya",
  "venezuela",
  "eia",
  "inventory",
  "barrel",
  "öl",
  "rohö",
  "erdöl",
  "sprit",
  "benzin",
] as const;

export function isOilRelevantText(text: string): boolean {
  const lower = text.toLowerCase();
  return OIL_FLASH_KEYWORDS.some((k) => lower.includes(k));
}

export function isFlashHotText(text: string): boolean {
  const lower = text.toLowerCase();
  const hot = [
    "iran",
    "hormuz",
    "attack",
    "strike",
    "missile",
    "drone",
    "sanctions",
    "war",
    "explosion",
    "outage",
    "opec",
    "embargo",
    "angriff",
    "sanktion",
  ];
  return hot.some((k) => lower.includes(k));
}
