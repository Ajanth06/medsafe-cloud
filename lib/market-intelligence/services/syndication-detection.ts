import { resolveSyndicationOrigin } from "@/lib/market-intelligence/services/news-normalizer";
import type { NormalizedNewsItem } from "@/lib/types/market";

export interface IndependentSourceResult {
  independentCount: number;
  syndicationGroups: Map<string, NormalizedNewsItem[]>;
  canonicalSources: NormalizedNewsItem[];
}

/**
 * Counts independent sources — syndicated copies of the same wire report count as one.
 */
export function countIndependentSources(items: NormalizedNewsItem[]): IndependentSourceResult {
  const groups = new Map<string, NormalizedNewsItem[]>();

  for (const item of items) {
    const origin =
      item.sourceOrigin ??
      item.syndicationGroup ??
      resolveSyndicationOrigin(item.source) ??
      item.sourceDomain ??
      item.source.toLowerCase();

    const existing = groups.get(origin) ?? [];
    existing.push(item);
    groups.set(origin, existing);
  }

  const canonicalSources = [...groups.values()].map((group) =>
    group.sort(
      (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
    )[0],
  );

  return {
    independentCount: groups.size,
    syndicationGroups: groups,
    canonicalSources,
  };
}

export function hasConflictingReports(items: NormalizedNewsItem[]): boolean {
  return items.some((i) => i.hasConflictingReports);
}

export function hasRetractions(items: NormalizedNewsItem[]): boolean {
  return items.some((i) => i.isRetracted);
}
