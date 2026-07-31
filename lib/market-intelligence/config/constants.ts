export const CONFIDENCE_WEIGHTS = {
  marketAnomaly: 20,
  wtiBrentSimultaneous: 15,
  threeIndependentSources: 25,
  twoIndependentSources: 15,
  officialSource: 30,
  conflictingSource: -20,
  crossAssetCorrelation: 20,
  strongMoveCritical: 10,
  staleData: -50,
} as const;

export const CONFIDENCE_THRESHOLDS = {
  low: 30,
  medium: 55,
  high: 75,
} as const;

export const STALE_DATA_THRESHOLD_MS = 120_000;

export const PROVIDER_TIMEOUT_MS = 2_500;

export const PROVIDER_RETRY_ATTEMPTS = 2;

export const VOLATILITY_THRESHOLDS = {
  elevated: 0.5,
  high: 1.5,
} as const;

export const CROSS_ASSET_MIN_MOVEMENTS = 3;

export const CROSS_ASSET_WINDOW_MINUTES = 10 as const;

export const OIL_CORRELATION_WINDOW_MINUTES = 10 as const;

export const OIL_CORRELATION_MIN_CHANGE = 1.0;
