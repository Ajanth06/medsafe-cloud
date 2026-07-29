import type { GeopoliticalEventType, NewsEventType, SourceType } from "@/lib/types/market";

export interface OfficialSourceDefinition {
  id: string;
  name: string;
  domain: string;
  sourceType: SourceType;
  category: "government" | "military" | "central_bank" | "energy" | "exchange";
  rssUrl?: string;
  enabled: boolean;
}

/** Public official sources — RSS/API where legally accessible. */
export const OFFICIAL_SOURCES: OfficialSourceDefinition[] = [
  { id: "fed", name: "Federal Reserve", domain: "federalreserve.gov", sourceType: "OFFICIAL_CENTRAL_BANK", category: "central_bank", rssUrl: "https://www.federalreserve.gov/feeds/press_all.xml", enabled: true },
  { id: "treasury", name: "US Treasury", domain: "home.treasury.gov", sourceType: "OFFICIAL_GOVERNMENT", category: "government", enabled: true },
  { id: "whitehouse", name: "White House", domain: "whitehouse.gov", sourceType: "OFFICIAL_GOVERNMENT", category: "government", enabled: true },
  { id: "dod", name: "US Department of Defense", domain: "defense.gov", sourceType: "OFFICIAL_MILITARY", category: "military", enabled: true },
  { id: "eia", name: "EIA", domain: "eia.gov", sourceType: "OFFICIAL_ENERGY", category: "energy", rssUrl: "https://www.eia.gov/rss/todayinenergy.xml", enabled: true },
  { id: "opec", name: "OPEC", domain: "opec.org", sourceType: "OFFICIAL_ENERGY", category: "energy", enabled: true },
  { id: "iea", name: "IEA", domain: "iea.org", sourceType: "OFFICIAL_ENERGY", category: "energy", enabled: true },
  { id: "ecb", name: "European Central Bank", domain: "ecb.europa.eu", sourceType: "OFFICIAL_CENTRAL_BANK", category: "central_bank", enabled: true },
  { id: "cme", name: "CME Group", domain: "cmegroup.com", sourceType: "OFFICIAL_ENERGY", category: "exchange", enabled: true },
  { id: "ice", name: "ICE", domain: "theice.com", sourceType: "OFFICIAL_ENERGY", category: "exchange", enabled: true },
];

export const SOURCE_CREDIBILITY_WEIGHTS: Record<SourceType, number> = {
  OFFICIAL_GOVERNMENT: 95,
  OFFICIAL_MILITARY: 90,
  OFFICIAL_CENTRAL_BANK: 92,
  OFFICIAL_ENERGY: 88,
  NEWS_WIRE: 80,
  MAJOR_MEDIA: 70,
  FINANCIAL_MEDIA: 65,
  LOCAL_MEDIA: 40,
  INDUSTRY_SOURCE: 55,
  SOCIAL_MEDIA: 15,
  UNKNOWN: 30,
};

/** Wire services that syndicate to many outlets — same origin */
export const SYNDICATION_ORIGINS: Record<string, string> = {
  reuters: "reuters",
  "reuters.com": "reuters",
  ap: "ap",
  "apnews.com": "ap",
  "associated press": "ap",
  afp: "afp",
  bloomberg: "bloomberg",
  "bloomberg.com": "bloomberg",
};

export const OIL_EVENT_TYPES: GeopoliticalEventType[] = [
  "ENERGY_SUPPLY_DISRUPTION",
  "PIPELINE_OUTAGE",
  "REFINERY_OUTAGE",
  "SHIPPING_DISRUPTION",
  "STRAIT_DISRUPTION",
  "OPEC_DECISION",
  "OIL_PRODUCTION_CHANGE",
  "MILITARY_STRIKE",
  "MISSILE_ATTACK",
  "DRONE_ATTACK",
  "WAR_ESCALATION",
  "SANCTIONS",
];

export const OIL_KEYWORD_SEEDS = [
  "oil", "crude", "WTI", "Brent", "OPEC", "Hormuz", "Red Sea",
  "pipeline", "refinery", "tanker", "shipping", "sanctions",
  "Iran", "Israel", "Saudi Arabia", "Middle East", "production",
  "supply", "export", "inventory", "EIA", "IEA",
] as const;

export const GEOPOLITICAL_KEYWORD_MAP: Partial<Record<GeopoliticalEventType, string[]>> = {
  MILITARY_STRIKE: ["strike", "attack", "military", "missile", "drone"],
  STRAIT_DISRUPTION: ["Hormuz", "Strait", "shipping", "tanker", "naval"],
  OPEC_DECISION: ["OPEC", "production cut", "output", "quota"],
  SANCTIONS: ["sanctions", "embargo", "restrictions", "ban"],
  CENTRAL_BANK_DECISION: ["Fed", "ECB", "rate", "interest", "monetary"],
};

export function mapToNewsEventType(geoType: GeopoliticalEventType): NewsEventType {
  if (["CENTRAL_BANK_DECISION", "INTEREST_RATE_DECISION", "INFLATION_DATA", "EMPLOYMENT_DATA", "GDP_DATA"].includes(geoType)) {
    return "ECONOMIC";
  }
  if (geoType === "CORPORATE_EVENT") return "CORPORATE";
  if (geoType === "SANCTIONS" || geoType === "TRADE_RESTRICTION") return "REGULATORY";
  if (geoType === "UNKNOWN") return "FINANCIAL";
  return "GEOPOLITICAL";
}
