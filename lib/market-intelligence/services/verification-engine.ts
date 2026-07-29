import { countIndependentSources, hasConflictingReports, hasRetractions } from "@/lib/market-intelligence/services/syndication-detection";
import { isOfficialSource } from "@/lib/market-intelligence/services/source-verification";
import type { NormalizedNewsItem, SourceVerification, SourceVerificationStatus } from "@/lib/types/market";

export interface VerificationResult extends SourceVerification {
  independentSourceCount: number;
  officialSourceCount: number;
}

export function verifyNewsCluster(items: NormalizedNewsItem[]): VerificationResult {
  if (items.length === 0) {
    return {
      status: "UNVERIFIED",
      sourceCount: 0,
      sources: [],
      lastVerifiedAt: new Date().toISOString(),
      hasOfficialSource: false,
      independentSourceCount: 0,
      officialSourceCount: 0,
    };
  }

  const { independentCount, canonicalSources } = countIndependentSources(items);
  const sources = canonicalSources.map((i) => i.sourceName ?? i.source);
  const hasOfficial = canonicalSources.some((i) => i.isOfficialSource || isOfficialSource(i.source));
  const officialCount = canonicalSources.filter((i) => i.isOfficialSource || isOfficialSource(i.source)).length;
  const conflicting = hasConflictingReports(items);
  const retracted = hasRetractions(items);

  let status: SourceVerificationStatus = "UNVERIFIED";

  if (retracted) {
    status = "RETRACTED";
  } else if (conflicting) {
    status = "CONFLICTING";
  } else if (hasOfficial && independentCount >= 2) {
    status = "OFFICIAL_CONFIRMATION";
  } else if (hasOfficial) {
    status = "OFFICIAL_SOURCE";
  } else if (independentCount >= 3) {
    status = "CONFIRMED";
  } else if (independentCount === 2) {
    status = "MULTIPLE_SOURCES";
  } else if (independentCount === 1) {
    status = "SINGLE_SOURCE";
  }

  return {
    status,
    sourceCount: independentCount,
    sources,
    lastVerifiedAt: new Date().toISOString(),
    hasOfficialSource: hasOfficial,
    independentSourceCount: independentCount,
    officialSourceCount: officialCount,
  };
}

export function upgradeVerification(
  current: SourceVerificationStatus,
  next: SourceVerificationStatus,
): SourceVerificationStatus {
  const rank: Record<SourceVerificationStatus, number> = {
    UNVERIFIED: 0,
    SINGLE_SOURCE: 1,
    CONFLICTING: 1,
    RETRACTED: 0,
    MULTIPLE_SOURCES: 2,
    CONFIRMED: 3,
    OFFICIAL_SOURCE: 4,
    OFFICIAL_CONFIRMATION: 5,
  };
  return rank[next] >= rank[current] ? next : current;
}
