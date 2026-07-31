import {
  FLASH_TOPIC_ORDER,
  classifyFlashTopic,
  isFlashHotText,
  isOilRelevantText,
  type FlashNewsTopic,
} from "@/lib/market-intelligence/config/oil-rss-feeds";
import { deduplicateByTitle } from "@/lib/market-intelligence/services/duplicate-detection";
import type { NormalizedNewsItem } from "@/lib/types/market";

/** Soft/noise headlines that look oil-related but rarely matter for flash. */
const NEGATIVE_FLASH_PATTERNS = [
  /wetter/i,
  /rezepte?/i,
  /horoskop/i,
  /sport\b/i,
  /fußball|fussball/i,
  /lottery|lotto/i,
  /celebrity|promi/i,
  /quiz\b/i,
  /gewinnspiel/i,
  /\bmode\b/i,
  /lifestyle/i,
];

/** Prefer very fresh in ranking */
const FLASH_WINDOW_MS = 6 * 60 * 60_000;
/** Still include recent oil/Iran items in the feed */
const INCLUDE_WINDOW_MS = 36 * 60 * 60_000;

export function isNoiseFlashText(text: string): boolean {
  return NEGATIVE_FLASH_PATTERNS.some((p) => p.test(text));
}

/** Oil/Iran relevant, not noise, published in the include window. */
export function isFlashCandidate(item: {
  title: string;
  summary: string;
  publishedAt: string;
}): boolean {
  const text = `${item.title} ${item.summary}`;
  if (!isOilRelevantText(text) || isNoiseFlashText(text)) return false;
  const age = Date.now() - new Date(item.publishedAt).getTime();
  if (Number.isNaN(age)) return false;
  // Allow slightly future-dated RSS clocks
  if (age < -30 * 60_000) return false;
  return age <= INCLUDE_WINDOW_MS;
}

/** @deprecated use isFlashCandidate */
export function isStrictFlashCandidate(item: {
  title: string;
  summary: string;
  publishedAt: string;
}): boolean {
  return isFlashCandidate(item);
}

/**
 * HOT only for real escalation language — not generic “oil price moves”.
 */
export function isEscalationHot(text: string): boolean {
  if (!isFlashHotText(text)) return false;
  if (
    /^preis für opec/i.test(text.trim()) &&
    !/iran|hormuz|angriff|sanktion/i.test(text)
  ) {
    return false;
  }
  return true;
}

export function scoreFlashItem(input: {
  item: NormalizedNewsItem;
  isNew: boolean;
  feedWeight?: number;
}): { score: number; hot: boolean; fresh: boolean; topic: FlashNewsTopic } {
  const text = `${input.item.title} ${input.item.summary}`;
  const age = Date.now() - new Date(input.item.publishedAt).getTime();
  const hot = isEscalationHot(text);
  const fresh = age >= 0 && age <= FLASH_WINDOW_MS;
  const topic = classifyFlashTopic(text);
  const isDe = input.item.language === "de";

  let score = 0;
  // Recency dominates so the list feels "aktuell"
  if (age < 30 * 60_000) score += 50;
  else if (age < 2 * 60 * 60_000) score += 35;
  else if (age < 6 * 60 * 60_000) score += 20;
  else if (age < 24 * 60 * 60_000) score += 8;

  if (input.isNew) score += 15;
  if (hot) score += 30;
  if (fresh) score += 15;
  if (input.item.isOfficialSource) score += 12;
  if (input.feedWeight) score += Math.round(input.feedWeight / 12);
  if (topic === "iran") score += 22;
  if (topic === "oil") score += 10;
  if (topic === "opec") score += 8;
  const src = `${input.item.source} ${input.item.sourceName ?? ""}`.toLowerCase();
  const priorityEn =
    /al jazeera|\bbbc\b|reuters|\bcnn\b|\bap ·|associated press|nyt ·|new york times|google news us/.test(
      src,
    );
  if (isDe) score += 12;
  else if (priorityEn) score += 20;
  else score -= 4;
  if (src.includes("al jazeera")) score += 26;
  if (/\bbbc\b/.test(src)) score += 22;
  if (src.includes("reuters")) score += 20;
  if (/\bcnn\b/.test(src)) score += 16;
  if (/\bap ·|associated press/.test(src)) score += 16;
  if (/nyt ·|new york times/.test(src)) score += 14;
  if (src.includes("google news us")) score += 12;

  return { score, hot, fresh, topic };
}

/**
 * Sort like the topic tabs: Iran → Öl → OPEC → … then newest first.
 */
export function sortFlashByTopicThenTime<
  T extends { topic: FlashNewsTopic; publishedAt: string; score?: number },
>(items: T[]): T[] {
  const topicRank = new Map(FLASH_TOPIC_ORDER.map((t, i) => [t, i]));
  return [...items].sort((a, b) => {
    const ta = topicRank.get(a.topic) ?? 99;
    const tb = topicRank.get(b.topic) ?? 99;
    if (ta !== tb) return ta - tb;
    const time =
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    if (time !== 0) return time;
    return (b.score ?? 0) - (a.score ?? 0);
  });
}

export function dedupeFlashItems<T extends { id: string; title: string; url?: string }>(
  items: T[],
): T[] {
  const byUrl = new Map<string, T>();
  const noUrl: T[] = [];
  for (const item of items) {
    const key = item.url?.toLowerCase().slice(0, 160);
    if (!key) {
      noUrl.push(item);
      continue;
    }
    if (!byUrl.has(key)) byUrl.set(key, item);
  }
  // Slightly looser than before so near-duplicates from DE wires still show once
  return deduplicateByTitle([...byUrl.values(), ...noUrl], 0.72);
}

export { FLASH_WINDOW_MS, INCLUDE_WINDOW_MS };
