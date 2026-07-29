export const INVESTIGATION_CONFIG = {
  /** Minutes before market move to search for news */
  beforeMinutes: 30,
  /** Minutes after market move to search for news */
  afterMinutes: 20,
  /** Watch mode duration in minutes after news-first event */
  watchModeMinutes: 60,
  /** Cache TTL for news search results */
  searchCacheTtlMs: 60_000,
  /** Minimum priority score for CRITICAL alert */
  criticalPriorityThreshold: 80,
  /** High priority threshold */
  highPriorityThreshold: 60,
} as const;

export const NEWS_RATE_LIMIT = {
  maxRetries: 3,
  baseBackoffMs: 1_000,
  maxBackoffMs: 30_000,
} as const;

export const LEAD_LAG_RELIABLE_THRESHOLD_MS = 5 * 60 * 1000;
