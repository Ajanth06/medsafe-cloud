import type { SourceVerificationStatus } from "@/lib/types/market";

const OFFICIAL_SOURCE_PATTERNS = [
  /federal reserve/i,
  /ecb/i,
  /european central bank/i,
  /opec/i,
  /white house/i,
  /treasury/i,
  /sec\.gov/i,
  /bundesbank/i,
];

export function isOfficialSource(source: string): boolean {
  return OFFICIAL_SOURCE_PATTERNS.some((pattern) => pattern.test(source));
}

export function resolveVerificationStatus(
  sourceCount: number,
  hasOfficialSource: boolean,
): SourceVerificationStatus {
  if (hasOfficialSource) return "OFFICIAL_SOURCE";
  if (sourceCount >= 3) return "CONFIRMED";
  if (sourceCount === 2) return "MULTIPLE_SOURCES";
  if (sourceCount === 1) return "SINGLE_SOURCE";
  return "UNVERIFIED";
}

export interface VerificationInput {
  sources: string[];
  hasConflictingReports?: boolean;
}

export function verifySources(input: VerificationInput): {
  status: SourceVerificationStatus;
  sourceCount: number;
  hasOfficialSource: boolean;
} {
  const uniqueSources = [...new Set(input.sources)];
  const hasOfficialSource = uniqueSources.some(isOfficialSource);

  let status = resolveVerificationStatus(uniqueSources.length, hasOfficialSource);

  if (input.hasConflictingReports && status !== "UNVERIFIED") {
    status = "SINGLE_SOURCE";
  }

  return {
    status,
    sourceCount: uniqueSources.length,
    hasOfficialSource,
  };
}
