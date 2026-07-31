import type { FlashNewsTopic } from "@/lib/market-intelligence/config/oil-rss-feeds";
import type { MiMessages } from "@/lib/i18n/mi";

export type NewsAgencyRegion =
  | "iranisch"
  | "amerikanisch"
  | "britisch"
  | "europäisch"
  | "international";

export function flashTopicLabel(
  topic: FlashNewsTopic,
  t: MiMessages,
): string {
  switch (topic) {
    case "oil":
      return t.topicOil;
    case "iran":
      return t.topicIran;
    case "opec":
      return t.topicOpec;
    case "inventory":
      return t.topicInventory;
    case "macro":
      return t.topicMacro;
    default:
      return t.topicOther;
  }
}

export function agencyRegionLabel(
  region: NewsAgencyRegion,
  t: MiMessages,
): string {
  switch (region) {
    case "iranisch":
      return t.regionIranian;
    case "amerikanisch":
      return t.regionAmerican;
    case "britisch":
      return t.regionBritish;
    case "europäisch":
      return t.regionEuropean;
    default:
      return t.regionInternational;
  }
}
