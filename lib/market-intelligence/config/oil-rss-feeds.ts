import type { FlashNewsTopic, SourceType } from "@/lib/types/market";

export type { FlashNewsTopic };

export const FLASH_TOPIC_LABELS_DE: Record<FlashNewsTopic, string> = {
  oil: "Öl & Preise",
  iran: "Iran & Geopolitik",
  opec: "OPEC",
  inventory: "Bestände / EIA",
  macro: "Makro / Fed",
  other: "Sonstiges",
};

export const FLASH_TOPIC_ORDER: FlashNewsTopic[] = [
  "iran",
  "oil",
  "opec",
  "inventory",
  "macro",
  "other",
];

export interface OilRssFeed {
  id: string;
  name: string;
  url: string;
  sourceType: SourceType;
  /** Soft weight for ranking flash items */
  weight: number;
  language: "de" | "en";
  /** Topic when the feed itself is already scoped */
  defaultTopic?: FlashNewsTopic;
}

/**
 * Free public RSS — Iran-first (AJ, BBC, US wires), DE, Reuters, Official.
 * Title + summary + link; images when the feed provides them (e.g. Tagesschau).
 */
export const OIL_RSS_FEEDS: OilRssFeed[] = [
  {
    id: "aljazeera",
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    sourceType: "MAJOR_MEDIA",
    weight: 99,
    language: "en",
    defaultTopic: "iran",
  },
  {
    id: "aljazeera-iran-gn",
    name: "Al Jazeera · Iran",
    url: "https://news.google.com/rss/search?q=when:3d+site:aljazeera.com+(Iran+OR+Tehran+OR+Hormuz+OR+IRGC+OR+sanctions+OR+oil)&hl=en&gl=US&ceid=US:en",
    sourceType: "MAJOR_MEDIA",
    weight: 100,
    language: "en",
    defaultTopic: "iran",
  },
  {
    id: "presstv-iran",
    name: "Press TV · Iran",
    url: "https://news.google.com/rss/search?q=when:3d+site:presstv.ir+(Iran+OR+oil+OR+Hormuz+OR+USA+OR+Trump)&hl=en&gl=US&ceid=US:en",
    sourceType: "MAJOR_MEDIA",
    weight: 98,
    language: "en",
    defaultTopic: "iran",
  },
  {
    id: "tehran-times",
    name: "Tehran Times",
    url: "https://news.google.com/rss/search?q=when:3d+site:tehrantimes.com+(Iran+OR+oil+OR+Hormuz+OR+sanctions)&hl=en&gl=US&ceid=US:en",
    sourceType: "MAJOR_MEDIA",
    weight: 97,
    language: "en",
    defaultTopic: "iran",
  },
  {
    id: "irna-iran",
    name: "IRNA · Iran",
    url: "https://news.google.com/rss/search?q=when:3d+site:irna.ir+(oil+OR+Hormuz+OR+USA+OR+Trump+OR+sanctions)&hl=en&gl=US&ceid=US:en",
    sourceType: "MAJOR_MEDIA",
    weight: 96,
    language: "en",
    defaultTopic: "iran",
  },
  {
    id: "bbc-middle-east",
    name: "BBC · Middle East",
    url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    sourceType: "MAJOR_MEDIA",
    weight: 97,
    language: "en",
    defaultTopic: "iran",
  },
  {
    id: "bbc-iran-gn",
    name: "BBC · Iran",
    url: "https://news.google.com/rss/search?q=when:3d+site:bbc.com+(Iran+OR+Tehran+OR+Hormuz+OR+oil+OR+sanctions)+OR+site:bbc.co.uk+(Iran+OR+Tehran)&hl=en&gl=GB&ceid=GB:en",
    sourceType: "MAJOR_MEDIA",
    weight: 98,
    language: "en",
    defaultTopic: "iran",
  },
  {
    id: "google-iran-en",
    name: "Google News US · Iran",
    url: "https://news.google.com/rss/search?q=when:3d+Iran+(oil+OR+Hormuz+OR+sanctions+OR+Trump+OR+strike+OR+Tehran+OR+IRGC)&hl=en&gl=US&ceid=US:en",
    sourceType: "MAJOR_MEDIA",
    weight: 96,
    language: "en",
    defaultTopic: "iran",
  },
  {
    id: "cnn-iran",
    name: "CNN · Iran",
    url: "https://news.google.com/rss/search?q=when:3d+site:cnn.com+(Iran+OR+Tehran+OR+Hormuz+OR+oil+sanctions)&hl=en&gl=US&ceid=US:en",
    sourceType: "MAJOR_MEDIA",
    weight: 95,
    language: "en",
    defaultTopic: "iran",
  },
  {
    id: "ap-iran",
    name: "AP · Iran",
    url: "https://news.google.com/rss/search?q=when:3d+site:apnews.com+(Iran+OR+Tehran+OR+Hormuz+OR+oil)&hl=en&gl=US&ceid=US:en",
    sourceType: "NEWS_WIRE",
    weight: 97,
    language: "en",
    defaultTopic: "iran",
  },
  {
    id: "nyt-iran",
    name: "NYT · Iran",
    url: "https://news.google.com/rss/search?q=when:3d+site:nytimes.com+(Iran+OR+Tehran+OR+Hormuz+OR+oil)&hl=en&gl=US&ceid=US:en",
    sourceType: "MAJOR_MEDIA",
    weight: 94,
    language: "en",
    defaultTopic: "iran",
  },
  {
    id: "google-oil-de",
    name: "Google News DE · Öl",
    url: "https://news.google.com/rss/search?q=Roh%C3%B6l+OR+%C3%96lpreis+OR+WTI+OR+Brent+OR+Benzinpreis&hl=de&gl=DE&ceid=DE:de",
    sourceType: "MAJOR_MEDIA",
    weight: 88,
    language: "de",
    defaultTopic: "oil",
  },
  {
    id: "google-iran-de",
    name: "Google News DE · Iran",
    url: "https://news.google.com/rss/search?q=Iran+(%C3%96l+OR+Roh%C3%B6l+OR+Hormuz+OR+Sanktionen+OR+Streit)+OR+Stra%C3%9Fe+der+Hormus&hl=de&gl=DE&ceid=DE:de",
    sourceType: "MAJOR_MEDIA",
    weight: 95,
    language: "de",
    defaultTopic: "iran",
  },
  {
    id: "google-iran-us-de",
    name: "Google News DE · Iran/USA",
    url: "https://news.google.com/rss/search?q=Iran+(USA+OR+US+OR+Trump+OR+Pentagon+OR+Sanktionen)+OR+(USA+Iran)&hl=de&gl=DE&ceid=DE:de",
    sourceType: "MAJOR_MEDIA",
    weight: 94,
    language: "de",
    defaultTopic: "iran",
  },
  {
    id: "google-trump-iran-de",
    name: "Google News DE · Trump/Iran",
    url: "https://news.google.com/rss/search?q=Trump+(Iran+OR+Teheran+OR+Hormuz)+OR+(Trump+Iran)&hl=de&gl=DE&ceid=DE:de",
    sourceType: "MAJOR_MEDIA",
    weight: 96,
    language: "de",
    defaultTopic: "iran",
  },
  {
    id: "google-iran-reagiert-de",
    name: "Google News DE · Iran reagiert",
    url: "https://news.google.com/rss/search?q=Iran+(reagiert+OR+droht+OR+Vergeltung+OR+Khamenei+OR+IRGC)+OR+(Iran+Trump)&hl=de&gl=DE&ceid=DE:de",
    sourceType: "MAJOR_MEDIA",
    weight: 95,
    language: "de",
    defaultTopic: "iran",
  },
  {
    id: "google-opec-de",
    name: "Google News DE · OPEC",
    url: "https://news.google.com/rss/search?q=OPEC+OR+OPEC%2B+OR+F%C3%B6rdermenge+%C3%96l&hl=de&gl=DE&ceid=DE:de",
    sourceType: "MAJOR_MEDIA",
    weight: 86,
    language: "de",
    defaultTopic: "opec",
  },
  {
    id: "tagesschau-wirtschaft",
    name: "Tagesschau Wirtschaft",
    url: "https://www.tagesschau.de/wirtschaft/index~rss2.xml",
    sourceType: "MAJOR_MEDIA",
    weight: 84,
    language: "de",
  },
  {
    id: "tagesschau-weltwirtschaft",
    name: "Tagesschau Weltwirtschaft",
    url: "https://www.tagesschau.de/wirtschaft/weltwirtschaft/index~rss2.xml",
    sourceType: "MAJOR_MEDIA",
    weight: 82,
    language: "de",
  },
  {
    id: "tagesschau-ausland",
    name: "Tagesschau Ausland",
    url: "https://www.tagesschau.de/ausland/index~rss2.xml",
    sourceType: "MAJOR_MEDIA",
    weight: 93,
    language: "de",
    defaultTopic: "iran",
  },
  {
    id: "reuters-oil-iran",
    name: "Reuters · Oil/Iran",
    url: "https://news.google.com/rss/search?q=when:2d+site:reuters.com+(oil+OR+Iran+OR+crude+OR+OPEC+OR+Hormuz+OR+Trump)&hl=en&gl=US&ceid=US:en",
    sourceType: "NEWS_WIRE",
    weight: 98,
    language: "en",
    defaultTopic: "iran",
  },
  {
    id: "reuters-iran-us",
    name: "Reuters · Iran/USA",
    url: "https://news.google.com/rss/search?q=when:2d+site:reuters.com+(Iran+(US+OR+USA+OR+Trump+OR+Pentagon+OR+strike))&hl=en&gl=US&ceid=US:en",
    sourceType: "NEWS_WIRE",
    weight: 99,
    language: "en",
    defaultTopic: "iran",
  },
  {
    id: "eia",
    name: "EIA",
    url: "https://www.eia.gov/rss/todayinenergy.xml",
    sourceType: "OFFICIAL_ENERGY",
    weight: 78,
    language: "en",
    defaultTopic: "inventory",
  },
  {
    id: "fed",
    name: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
    sourceType: "OFFICIAL_CENTRAL_BANK",
    weight: 70,
    language: "en",
    defaultTopic: "macro",
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
  "trump",
  "pentagon",
  "white house",
  "usa",
  "u.s.",
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
  "kraftstoff",
  "fördermenge",
  "sanktion",
  "straße der hormus",
  "strasse der hormus",
] as const;

const TOPIC_RULES: { topic: FlashNewsTopic; keys: string[] }[] = [
  {
    topic: "iran",
    keys: [
      "iran",
      "hormuz",
      "teheran",
      "tehran",
      "irgc",
      "straße der hormus",
      "strasse der hormus",
      "strait of hormuz",
      "trump",
      "pentagon",
      "white house",
    ],
  },
  {
    topic: "opec",
    keys: ["opec", "opec+", "fördermenge", "production cut", "quota"],
  },
  {
    topic: "inventory",
    keys: [
      "eia",
      "inventory",
      "inventories",
      "vorrat",
      "lagerbestand",
      "crude stocks",
      "api ",
    ],
  },
  {
    topic: "macro",
    keys: [
      "federal reserve",
      "fed ",
      "zins",
      "interest rate",
      "inflation",
      "dollar",
      "ezb",
      "ecb",
    ],
  },
  {
    topic: "oil",
    keys: [
      "oil",
      "crude",
      "wti",
      "brent",
      "öl",
      "rohö",
      "erdöl",
      "benzin",
      "sprit",
      "kraftstoff",
      "barrel",
      "refinery",
      "raffinerie",
      "tanker",
      "pipeline",
    ],
  },
];

export function isOilRelevantText(text: string): boolean {
  const lower = text.toLowerCase();
  return OIL_FLASH_KEYWORDS.some((k) => lower.includes(k));
}

/** Stricter gate for broad world feeds (Al Jazeera, BBC Middle East). */
export function isWorldFeedIranRelevantText(text: string): boolean {
  const lower = text.toLowerCase();
  const keys = [
    "iran",
    "tehran",
    "teheran",
    "oil",
    "crude",
    "opec",
    "hormuz",
    "sanctions",
    "missile",
    "drone",
    "gaza",
    "israel",
    "pentagon",
    "trump",
    "refinery",
    "tanker",
    "pipeline",
    "brent",
    "wti",
    "irgc",
    "khamenei",
    "strait",
    "persian gulf",
    "gulf",
  ];
  return keys.some((k) => lower.includes(k));
}

/** @deprecated use isWorldFeedIranRelevantText */
export function isAlJazeeraRelevantText(text: string): boolean {
  return isWorldFeedIranRelevantText(text);
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
    "embargo",
    "angriff",
    "sanktion",
    "rakete",
    "drohne",
    "eskalation",
    "krieg",
    "schließung",
    "blockade",
    "straße der hormus",
    "strasse der hormus",
    "trump",
    "pentagon",
  ];
  return hot.some((k) => lower.includes(k));
}

/** Prefer specific geopolitics/OPEC over generic oil. */
export function classifyFlashTopic(
  text: string,
  fallback?: FlashNewsTopic,
): FlashNewsTopic {
  const lower = text.toLowerCase();
  for (const rule of TOPIC_RULES) {
    if (rule.keys.some((k) => lower.includes(k))) {
      return rule.topic;
    }
  }
  return fallback ?? "other";
}

/** Iran + US / Trump / Pentagon angle for the dedicated header. */
export function isIranUsText(text: string): boolean {
  const lower = text.toLowerCase();
  const hasIran = /iran|teheran|tehran|hormuz|irgc|khamenei/.test(lower);
  const hasUs =
    /\busa\b|\bu\.s\.|\bunited states\b|\btrump\b|\bpentagon\b|\bwhite house\b|\bwashington\b|\bamerikan/.test(
      lower,
    );
  return hasIran && hasUs;
}

export type IranUsSide = "trump" | "iran" | "both";

/**
 * Who is "speaking" / driving the headline:
 * - trump: Trump/USA statements, threats, strikes framed from US side
 * - iran: Iran/Tehran/IRGC/Khamenei reaction or statements
 * - both: exchange / war framing without clear single speaker
 */
export function classifyIranUsSide(text: string): IranUsSide | null {
  const lower = text.toLowerCase();
  const hasIran = /iran|teheran|tehran|hormuz|irgc|khamenei/.test(lower);
  const hasTrumpOrUs =
    /\btrump\b|\busa\b|\bu\.s\.|\bunited states\b|\bpentagon\b|\bwhite house\b|\bwashington\b|\bamerikan/.test(
      lower,
    );

  if (!hasIran) return null;
  if (!hasTrumpOrUs && !/(vergeltung|reagiert|droht)/.test(lower)) return null;

  // US/Trump as attacker / speaker about Iran
  const usAttacksIran =
    /(usa|u\.s\.|trump|pentagon|white house|amerikan).{0,50}(greift|angriff|schlag|bombardiert|strike|attack|raid|sanktion)/.test(
      lower,
    ) ||
    /(greift|angriff|schlag|bombardiert|strike).{0,40}(iran|teheran)/.test(lower) ||
    /\btrump\b.{0,40}(iran|teheran)/.test(lower);

  // Iran as speaker / reactor
  const iranSpeaks =
    /(iran|teheran|tehran|khamenei|irgc|revolutionsgarde).{0,45}(reagiert|droht|vergeltung|warnt|sagt|erklärt|antwortet|schlägt zurück|retaliation|responds|threatens|vows|will)/.test(
      lower,
    ) ||
    /(vergeltung|rache|erwiderung|konter).{0,40}(trump|usa|amerikan)/.test(lower) ||
    /(khamenei|irgc).{0,30}(trump|usa|amerikan)/.test(lower);

  if (iranSpeaks && !usAttacksIran) return "iran";
  if (usAttacksIran && !iranSpeaks) return "trump";
  if (iranSpeaks && usAttacksIran) return "both";
  if (/\btrump\b/.test(lower)) return "trump";
  if (iranSpeaks || /khamenei|irgc/.test(lower)) return "iran";
  return hasTrumpOrUs ? "trump" : "iran";
}

export function topicEntity(topic: FlashNewsTopic): string {
  return `TOPIC_${topic.toUpperCase()}`;
}

export function parseTopicEntity(
  entities?: string[],
): FlashNewsTopic | undefined {
  const hit = entities?.find((e) => e.startsWith("TOPIC_"));
  if (!hit) return undefined;
  const raw = hit.replace("TOPIC_", "").toLowerCase() as FlashNewsTopic;
  return FLASH_TOPIC_ORDER.includes(raw) ? raw : undefined;
}
