export type MarketStatus = "OPEN" | "CLOSED" | "PRE_MARKET" | "AFTER_HOURS";

export type PriceDirection = "up" | "down" | "flat";

export type AssetClass =
  | "index"
  | "commodity"
  | "forex"
  | "crypto"
  | "bond"
  | "volatility";

export type VolatilityStatus = "NORMAL" | "ELEVATED" | "HIGH_VOLATILITY";

export type AnomalyDirection = "UP" | "DOWN";

export type EventSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AlertSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type EventStatus =
  | "ACTIVE"
  | "MONITORING"
  | "RESOLVED"
  | "CONFIRMED"
  | "PENDING";

export type MarketEventType =
  | "PRICE_SPIKE"
  | "PRICE_DROP"
  | "VOLUME_SURGE"
  | "THRESHOLD_BREACH"
  | "UNUSUAL_MOVEMENT"
  | "OIL_MARKET_ANOMALY"
  | "CROSS_MARKET_EVENT"
  | "UPSIDE_ANOMALY"
  | "DOWNSIDE_ANOMALY";

export type NewsEventType =
  | "GEOPOLITICAL"
  | "ECONOMIC"
  | "FINANCIAL"
  | "REGULATORY"
  | "CORPORATE";

export type SourceVerificationStatus =
  | "UNVERIFIED"
  | "SINGLE_SOURCE"
  | "MULTIPLE_SOURCES"
  | "CONFIRMED"
  | "OFFICIAL_SOURCE"
  | "OFFICIAL_CONFIRMATION"
  | "CONFLICTING"
  | "RETRACTED";

export type GeopoliticalEventType =
  | "GEOPOLITICAL_CONFLICT"
  | "MILITARY_STRIKE"
  | "MISSILE_ATTACK"
  | "DRONE_ATTACK"
  | "WAR_ESCALATION"
  | "CEASEFIRE"
  | "SANCTIONS"
  | "TRADE_RESTRICTION"
  | "ENERGY_SUPPLY_DISRUPTION"
  | "PIPELINE_OUTAGE"
  | "REFINERY_OUTAGE"
  | "SHIPPING_DISRUPTION"
  | "STRAIT_DISRUPTION"
  | "OPEC_DECISION"
  | "OIL_PRODUCTION_CHANGE"
  | "CENTRAL_BANK_DECISION"
  | "INTEREST_RATE_DECISION"
  | "INFLATION_DATA"
  | "EMPLOYMENT_DATA"
  | "GDP_DATA"
  | "POLITICAL_EVENT"
  | "CYBER_ATTACK"
  | "NATURAL_DISASTER"
  | "CORPORATE_EVENT"
  | "UNKNOWN";

export type SourceType =
  | "OFFICIAL_GOVERNMENT"
  | "OFFICIAL_MILITARY"
  | "OFFICIAL_CENTRAL_BANK"
  | "OFFICIAL_ENERGY"
  | "NEWS_WIRE"
  | "MAJOR_MEDIA"
  | "FINANCIAL_MEDIA"
  | "LOCAL_MEDIA"
  | "INDUSTRY_SOURCE"
  | "SOCIAL_MEDIA"
  | "UNKNOWN";

export type IntelligenceEventState =
  | "DETECTED"
  | "INVESTIGATING"
  | "UNVERIFIED"
  | "VERIFIED"
  | "WATCH"
  | "MARKET_REACTION_DETECTED"
  | "AI_ANALYZED"
  | "ALERTED"
  | "MONITORING"
  | "RESOLVED"
  | "RETRACTED"
  | "CONFLICTING";

export type CausalityStatus =
  | "UNKNOWN"
  | "POSSIBLE"
  | "LIKELY"
  | "HIGHLY_LIKELY"
  | "CONFIRMED_DIRECT";

export type NewsDataAvailability = "LIVE" | "DEMO" | "DELAYED" | "UNAVAILABLE";

export type MarketRelevanceLevel = "HIGH" | "MEDIUM" | "POSSIBLE";

export type LeadLagLeader = "MARKET" | "NEWS" | "UNKNOWN";

export type MarketSentiment =
  | "BULLISH"
  | "BEARISH"
  | "NEUTRAL"
  | "WATCH"
  | "BEARISH / WATCH"
  | "BULLISH PRESSURE"
  | "BEARISH PRESSURE"
  | "RISK-ON"
  | "RISK-OFF"
  | "UNCERTAIN";

export type MarketRegime = "RISK-ON" | "RISK-OFF" | "NEUTRAL";

export type ConfidenceLevel = "LOW" | "MEDIUM" | "HIGH";

export type ExtendedConfidenceLevel =
  | "VERY_LOW"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "VERY_HIGH";

export type AIMarketRegime =
  | "RISK_ON"
  | "RISK_OFF"
  | "INFLATIONARY"
  | "DEFLATIONARY"
  | "LIQUIDITY_DRIVEN"
  | "ENERGY_SHOCK"
  | "GEOPOLITICAL_RISK"
  | "MACRO_EVENT"
  | "MIXED"
  | "NEUTRAL"
  | "UNCERTAIN";

export type AssetPressure =
  | "STRONG_BULLISH_PRESSURE"
  | "BULLISH_PRESSURE"
  | "NEUTRAL"
  | "BEARISH_PRESSURE"
  | "STRONG_BEARISH_PRESSURE"
  | "UNCERTAIN";

export type ReactionPhase =
  | "PRE_REACTION"
  | "EARLY_REACTION"
  | "ACTIVE_REACTION"
  | "EXTENDED_MOVE"
  | "POST_SPIKE"
  | "REVERSAL_RISK"
  | "UNCERTAIN";

export type EventSignificance =
  | "NOISE"
  | "LOW"
  | "MODERATE"
  | "HIGH"
  | "SYSTEMIC";

export type WatchItemType =
  | "OFFICIAL_CONFIRMATION"
  | "MARKET_LEVEL"
  | "SECONDARY_MARKET_CONFIRMATION"
  | "COUNTERPARTY_RESPONSE"
  | "SUPPLY_DISRUPTION"
  | "MACRO_RELEASE"
  | "NEWS_CONFIRMATION";

export type EvidenceReferenceType = "NEWS" | "MARKET" | "OFFICIAL";

export type AIJobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "RETRYING"
  | "CANCELLED"
  | "TIMEOUT";

export type AIAnalysisMode = "LIVE" | "DEMO" | "FALLBACK" | "UNAVAILABLE";

export type ComparisonOperator = ">=" | "<=" | ">" | "<" | "==";

export type ProviderHealthStatus = "ONLINE" | "OFFLINE" | "STALE" | "DEGRADED";

export type EngineStatus = "ACTIVE" | "READY" | "OFFLINE" | "NOT_CONFIGURED" | "DEGRADED";

export type DataAvailability =
  | "LIVE"
  | "DELAYED"
  | "DEMO"
  | "UNAVAILABLE"
  | "STALE";

export type FeedConnectionState =
  | "CONNECTED"
  | "DISCONNECTED"
  | "RECONNECTING"
  | "NOT_CONFIGURED";

export type ProviderPriority = "PRIMARY" | "SECONDARY" | "FALLBACK";

export type TimeWindowMinutes = 1 | 5 | 10 | 15 | 30 | 60;

export interface FuturesContractInfo {
  contractSymbol: string;
  productCode: string;
  expirationDate: string | null;
  isFrontMonth: boolean;
  exchange: string;
  rolloverDetected?: boolean;
}

export interface QuoteTimestamps {
  providerTimestamp: string | null;
  receivedAt: string;
  processedAt: string;
}

export interface FeedLatency {
  providerToServerMs: number | null;
  serverProcessingMs: number | null;
  totalPipelineMs: number | null;
}

export interface MarketAssetDefinition {
  assetId: string;
  symbol: string;
  providerSymbol: string;
  name: string;
  assetClass: AssetClass;
  priority?: "primary" | "standard";
}

export interface PriceSnapshot {
  assetId: string;
  symbol: string;
  price: number;
  timestamp: string;
}

export interface HistoricalPrice {
  timestamp: string;
  price: number;
}

export interface NormalizedMarketQuote {
  assetId: string;
  symbol: string;
  providerSymbol: string;
  contractSymbol?: string;
  name: string;
  instrumentLabel?: string;
  assetClass: AssetClass;
  exchange?: string;
  currency?: string;
  price: number;
  bid?: number;
  ask?: number;
  previousClose: number;
  absoluteChange: number;
  percentageChange: number;
  timestamp: string;
  receivedAt?: string;
  processedAt?: string;
  providerTimestamp?: string | null;
  marketStatus: MarketStatus;
  isRealtime: boolean;
  delaySeconds?: number;
  dataAvailability: DataAvailability;
  source: string;
  contract?: FuturesContractInfo;
  latency?: FeedLatency;
  staleAfterSeconds?: number;
}

export interface WindowReturns {
  m1?: number;
  m5?: number;
  m10?: number;
  m15?: number;
  m30?: number;
  m60?: number;
}

/** Enriched quote used by the dashboard UI. */
export interface EnrichedMarketQuote extends NormalizedMarketQuote {
  direction: PriceDirection;
  returns: WindowReturns;
  sparkline: number[];
  volatilityStatus: VolatilityStatus;
  isStale: boolean;
}

/** @deprecated Use EnrichedMarketQuote — kept for backward compatibility. */
export type MarketQuote = EnrichedMarketQuote;

export interface WindowReturnDetail {
  windowMinutes: TimeWindowMinutes;
  startPrice: number;
  currentPrice: number;
  absoluteChange: number;
  percentageChange: number;
  direction: AnomalyDirection;
}

export interface AnomalyDetectionRule {
  id: string;
  assetId: string;
  symbol: string;
  assetName: string;
  windowMinutes: TimeWindowMinutes;
  thresholdPercent: number;
  severity: EventSeverity;
  direction: "BOTH" | "UP" | "DOWN";
  enabled: boolean;
}

export interface AnomalyEvent {
  id: string;
  assetId: string;
  asset: string;
  symbol: string;
  direction: AnomalyDirection;
  percentageChange: number;
  absoluteChange: number;
  windowMinutes: TimeWindowMinutes;
  startPrice: number;
  currentPrice: number;
  detectedAt: string;
  severity: EventSeverity;
  eventType: MarketEventType;
  status: EventStatus;
  description: string;
  confidenceBoost?: number;
}

export interface MarketEvent extends Omit<AnomalyEvent, "windowMinutes"> {
  priceChange: number;
  priceChangePercent: number;
  timestamp: string;
  windowMinutes: number;
}

export interface OilCorrelationResult {
  wtiChange: WindowReturnDetail | null;
  brentChange: WindowReturnDetail | null;
  bothConfirmed: boolean;
  sameDirection: boolean;
  windowMinutes: TimeWindowMinutes;
  confidenceBoost: number;
  eventType: "OIL_MARKET_ANOMALY" | "NONE";
  description: string;
}

export interface BrentWTISpread {
  brentPrice: number;
  wtiPrice: number;
  spread: number;
  previousSpread: number;
  spreadChange: number;
  spreadChangePercent: number;
  timestamp: string;
}

export interface CrossAssetMovement {
  symbol: string;
  name: string;
  percentageChange: number;
  direction: AnomalyDirection;
  windowMinutes: TimeWindowMinutes;
}

export interface CrossAssetCorrelationResult {
  id: string;
  detectedAt: string;
  windowMinutes: TimeWindowMinutes;
  movements: CrossAssetMovement[];
  possibleRegime: MarketRegime;
  eventType: "POTENTIAL_CROSS-MARKET_EVENT" | "NONE";
  description: string;
  confidenceBoost: number;
}

export interface ConfidenceFactor {
  label: string;
  delta: number;
}

export interface ConfidenceScore {
  score: number;
  level: ConfidenceLevel;
  factors: ConfidenceFactor[];
}

export interface EventTimestamps {
  marketMoveStartedAt?: string;
  anomalyDetectedAt?: string;
  firstNewsDetectedAt?: string;
  multipleSourcesDetectedAt?: string;
  officialConfirmationAt?: string;
  aiAnalysisCompletedAt?: string;
  alertCreatedAt?: string;
  eventOccurrenceTime?: string;
  firstSourcePublished?: string;
  aaryxReceived?: string;
  verificationTime?: string;
  linkedToMarketEventAt?: string;
  verifiedAt?: string;
  processedAt?: string;
}

export interface SourceVerification {
  status: SourceVerificationStatus;
  sourceCount: number;
  sources: string[];
  lastVerifiedAt: string;
  hasOfficialSource?: boolean;
}

export interface AffectedMarket {
  symbol: string;
  name: string;
  changePercent: number;
}

export interface ExtendedAIAnalysis {
  eventSummary: string;
  eventType: NewsEventType | MarketEventType;
  marketRegime: MarketRegime;
  affectedAssets: AffectedMarket[];
  directionalImpact: Record<string, MarketSentiment>;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  possibleCause: string;
  alternativeExplanation: string;
  keyRisks: string[];
  whatToWatchNext: string[];
  disclaimer: string;
}

export interface EvidenceReference {
  type: EvidenceReferenceType;
  id: string;
  label?: string;
}

export interface AIFact {
  id: string;
  statement: string;
  evidence: EvidenceReference[];
}

export interface AssetImpact {
  asset: string;
  relevance: MarketRelevanceLevel;
  pressure: AssetPressure;
  confidence: ExtendedConfidenceLevel;
  explanation: string;
}

export interface PossibleCauseAnalysis {
  description: string;
  causalityStatus: CausalityStatus;
  supportingEvidence: EvidenceReference[];
  contradictingEvidence: EvidenceReference[];
}

export interface WatchItem {
  type: WatchItemType;
  description: string;
  relatedAsset?: string;
  relatedEntity?: string;
  priority: AlertSeverity;
  resolved: boolean;
}

export interface AIAnalysisMetrics {
  aiJobCreatedAt: string;
  aiStartedAt?: string;
  aiCompletedAt?: string;
  analysisLatencyMs?: number;
  endToEndAlertLatencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  inputContextHash?: string;
}

export interface AIAnalysisResult {
  id: string;
  eventId: string;
  version: number;
  summary: string;
  eventType: GeopoliticalEventType | NewsEventType | MarketEventType;
  marketRegime: AIMarketRegime;
  possibleCause: PossibleCauseAnalysis;
  alternativeExplanations: string[];
  affectedAssets: AssetImpact[];
  impactAssessment: string;
  confidence: ExtendedConfidenceLevel;
  confidenceScore: number;
  confidenceReasons: string[];
  uncertaintyReasons: string[];
  keyRisks: string[];
  whatToWatchNext: WatchItem[];
  marketAlreadyMoved: boolean;
  moveAssessment: string;
  reactionPhase: ReactionPhase;
  sourceAssessment: string;
  eventSignificance: EventSignificance;
  facts: AIFact[];
  interpretations: string[];
  evidence: EvidenceReference[];
  generatedAt: string;
  model: string;
  promptVersion: string;
  mode: AIAnalysisMode;
  metrics?: AIAnalysisMetrics;
  changeSummary?: AIAnalysisChangeSummary;
  whyThisAlert?: string[];
  disclaimer: string;
}

export interface AIAnalysisChangeSummary {
  whatChanged: string[];
  confidenceDelta?: number;
  previousConfidence?: ExtendedConfidenceLevel;
  newConfidence?: ExtendedConfidenceLevel;
  updatedAssessment?: string;
  newRisks?: string[];
}

export interface AIAnalysisVersion {
  id: string;
  version: number;
  analysis: AIAnalysisResult;
  createdAt: string;
  trigger: "INITIAL" | "UPDATE" | "MANUAL" | "REANALYZE";
}

export interface AIAnalysisJob {
  id: string;
  eventId: string;
  status: AIJobStatus;
  trigger: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retryCount: number;
}

export interface AIAnalysis {
  marketRegime: MarketRegime;
  assessments: {
    asset: string;
    sentiment: MarketSentiment;
  }[];
  confidence: ConfidenceLevel;
  potentialCause: string;
  keyRisk: string;
  disclaimer: string;
}

export interface NewsEvent {
  id: string;
  timestamp: string;
  title: string;
  summary: string;
  eventType: NewsEventType;
  severity: EventSeverity;
  sourceVerification: SourceVerification;
  affectedMarkets: AffectedMarket[];
  status: EventStatus;
  /** Fresh oil/geopolitical flash item */
  isFlash?: boolean;
  url?: string;
}

export interface NormalizedNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url?: string;
  categories: NewsEventType[];
  isOfficialSource?: boolean;
  /** Phase 4 extended fields */
  provider?: string;
  providerEventId?: string;
  bodySnippet?: string;
  sourceName?: string;
  sourceDomain?: string;
  sourceType?: SourceType;
  sourceOrigin?: string;
  syndicationGroup?: string;
  providerReceivedAt?: string;
  aaryxReceivedAt?: string;
  processedAt?: string;
  language?: string;
  geopoliticalType?: GeopoliticalEventType;
  entities?: string[];
  rawKeywords?: string[];
  credibilityScore?: number;
  dataAvailability?: NewsDataAvailability;
  hasConflictingReports?: boolean;
  isRetracted?: boolean;
}

export interface NewsSourceEntry {
  id: string;
  sourceName: string;
  sourceType: SourceType;
  sourceDomain?: string;
  publishedAt: string;
  headline: string;
  url?: string;
  isOfficial: boolean;
  sourceOrigin?: string;
  syndicationGroup?: string;
  role: "FIRST_REPORT" | "INDEPENDENT_CONFIRMATION" | "OFFICIAL_CONFIRMATION" | "UPDATE" | "RETRACTION";
}

export interface IntelligenceEventUpdate {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  verificationStatus?: SourceVerificationStatus;
}

export interface AuditEntry {
  timestamp: string;
  reason: string;
  factor: string;
}

export interface MarketLeadLag {
  marketMoveStartedAt: string | null;
  firstNewsAt: string | null;
  anomalyDetectedAt: string | null;
  differenceMs: number | null;
  leader: LeadLagLeader;
  label: string;
  isReliable: boolean;
}

export interface MarketNewsCorrelation {
  marketEventId: string;
  intelligenceEventId: string;
  timeDifferenceMs: number;
  affectedAssets: string[];
  correlationConfidence: ConfidenceLevel;
  possibleCausality: CausalityStatus;
  note: string;
}

export interface IntelligenceEventCluster {
  id: string;
  eventType: GeopoliticalEventType;
  newsEventType: NewsEventType;
  headline: string;
  summary: string;
  state: IntelligenceEventState;
  verification: SourceVerification;
  sources: NewsSourceEntry[];
  independentSourceCount: number;
  officialSourceCount: number;
  firstReportAt: string;
  latestUpdateAt: string;
  affectedRegion?: string;
  potentiallyAffectedMarkets: string[];
  marketRelevance: Record<string, MarketRelevanceLevel>;
  priority: AlertSeverity;
  priorityScore: number;
  causality: CausalityStatus;
  leadLag?: MarketLeadLag;
  timestamps: EventTimestamps;
  marketCorrelation?: MarketNewsCorrelation;
  aiAnalysis?: ExtendedAIAnalysis;
  aiAnalysisResult?: AIAnalysisResult;
  analysisVersions?: AIAnalysisVersion[];
  currentAnalysisId?: string;
  updates: IntelligenceEventUpdate[];
  watchMode: boolean;
  auditTrail: AuditEntry[];
  dataAvailability: NewsDataAvailability;
  oilReaction?: OilNewsReaction;
}

export interface OilNewsReaction {
  wtiPriceAtNews?: number;
  brentPriceAtNews?: number;
  wtiAfter1m?: number;
  wtiAfter5m?: number;
  wtiAfter15m?: number;
  wtiAfter30m?: number;
  wtiAfter60m?: number;
  brentAfter1m?: number;
  brentAfter5m?: number;
  brentAfter15m?: number;
  brentAfter30m?: number;
  brentAfter60m?: number;
}

export interface NewsProviderHealthInfo {
  providerId: string;
  status: ProviderHealthStatus;
  lastUpdate: string | null;
  latencyMs?: number;
  error?: string;
  rateLimitRemaining?: number;
}

export interface NewsSystemHealth {
  newsEngine: EngineStatus;
  providers: NewsProviderHealthInfo[];
  officialSources: EngineStatus;
  verificationEngine: EngineStatus;
  eventCorrelation: EngineStatus;
  lastNewsAt: string | null;
  averageNewsLatencyMs: number | null;
  isLive: boolean;
  /** Human-readable primary wire (e.g. NewsAPI.org / Demo) */
  primarySource: string;
  /** Official RSS contribution label */
  officialSourceLabel: string;
}

export interface IntelligenceEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  category:
    | "detection"
    | "threshold"
    | "news"
    | "verification"
    | "classification"
    | "ai"
    | "correlation"
    | "oil"
    | "alert";
}

export interface LiveFeedEntry {
  id: string;
  timestamp: string;
  title: string;
  description?: string;
  category: IntelligenceEvent["category"];
  severity?: EventSeverity | AlertSeverity;
}

export interface AlertPerformanceSnapshot {
  minutesAfter: number;
  price: number;
  changePercent: number;
}

export interface AlertPerformanceTracking {
  priceAtAlert: number;
  priceAfter5m?: number;
  priceAfter15m?: number;
  priceAfter30m?: number;
  priceAfter60m?: number;
  maxMoveAfterAlert?: number;
  maxAdverseMove?: number;
  snapshots: AlertPerformanceSnapshot[];
}

export interface IntelligenceAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  possibleEvent?: string;
  verification?: SourceVerificationStatus;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  status: EventStatus;
  affectedAssets: AffectedMarket[];
  timestamps: EventTimestamps;
  performance?: AlertPerformanceTracking;
}

export interface MarketAlert {
  id: string;
  triggeredAt: string;
  asset: string;
  symbol: string;
  alertPrice: number;
  severity: EventSeverity;
  eventType: MarketEventType;
  aiAssessmentCorrect: boolean | null;
  performanceSnapshots: AlertPerformanceSnapshot[];
}

export interface ProviderHealth {
  providerId: string;
  status: ProviderHealthStatus;
  lastUpdate: string | null;
  latencyMs?: number;
  error?: string;
}

export interface SystemHealth {
  marketData: ProviderHealthStatus;
  wtiFeed: ProviderHealthStatus;
  brentFeed: ProviderHealthStatus;
  goldFeed?: ProviderHealthStatus;
  newsEngine: EngineStatus;
  aiEngine: EngineStatus;
  eventDetection: EngineStatus;
  websocket: FeedConnectionState;
  restFallback: EngineStatus;
  lastMarketUpdate: string | null;
  lastHeartbeat: string | null;
  averageLatencyMs: number | null;
  dataSource: string;
  isLive: boolean;
  providerConfigured: boolean;
  perAssetLatency: Record<string, number | null>;
  newsHealth?: NewsSystemHealth;
  operationsHealth?: OperationsHealth;
}

export type BackgroundJobStatus =
  | "PENDING"
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "RETRYING"
  | "CANCELLED"
  | "DEAD_LETTER";

export type BackgroundJobType =
  | "MARKET_MONITORING"
  | "MARKET_EVENT_INVESTIGATION"
  | "NEWS_REFRESH"
  | "OFFICIAL_SOURCE_REFRESH"
  | "AI_ANALYSIS"
  | "ALERT_DELIVERY"
  | "ALERT_UPDATE"
  | "PERFORMANCE_SNAPSHOT"
  | "SYSTEM_HEALTH_CHECK";

export type AlertDeliveryStatus =
  | "PENDING"
  | "SENT"
  | "DELIVERED"
  | "FAILED"
  | "RETRYING"
  | "SUPPRESSED"
  | "DEDUPLICATED";

export type AlertChannelType = "IN_APP" | "TELEGRAM" | "WEB_PUSH" | "EMAIL";

export type AlertReadStatus = "UNREAD" | "READ" | "ACKNOWLEDGED";

export interface BackgroundJob {
  id: string;
  type: BackgroundJobType;
  status: BackgroundJobStatus;
  payload?: Record<string, unknown>;
  createdAt: string;
  queuedAt?: string;
  startedAt?: string;
  completedAt?: string;
  attempts: number;
  lastError?: string;
  nextRetryAt?: string;
  idempotencyKey?: string;
}

export interface AlertFingerprint {
  eventId: string;
  severity: AlertSeverity;
  verification?: SourceVerificationStatus;
  alertType: "NEW" | "UPDATE" | "RETRACTION" | "CONFLICT";
  analysisVersion?: number;
}

export interface DeliveredAlert {
  id: string;
  eventId: string;
  intelligenceEventId?: string;
  severity: AlertSeverity;
  title: string;
  body: string;
  alertType: "NEW" | "UPDATE" | "RETRACTION" | "CONFLICT";
  fingerprint: string;
  verification?: SourceVerificationStatus;
  confidence?: ConfidenceLevel;
  confidenceScore?: number;
  affectedAssets: AffectedMarket[];
  deepLink: string;
  readStatus: AlertReadStatus;
  eventStatus: EventStatus;
  materialChange?: string[];
  createdAt: string;
  updatedAt: string;
  originalAlertId?: string;
  latency?: PipelineLatency;
}

export interface PipelineLatency {
  marketEventCreatedAt?: string;
  investigationStartedAt?: string;
  newsVerifiedAt?: string;
  aiStartedAt?: string;
  aiCompletedAt?: string;
  alertQueuedAt?: string;
  alertSentAt?: string;
  marketToAlertMs?: number;
  newsToAlertMs?: number;
  aiLatencyMs?: number;
  deliveryLatencyMs?: number;
}

export interface AlertDeliveryRecord {
  id: string;
  alertId: string;
  eventId: string;
  channel: AlertChannelType;
  status: AlertDeliveryStatus;
  messageVersion: number;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  attempts: number;
  error?: string;
}

export interface WorkerHeartbeat {
  workerId: string;
  workerType: string;
  lastBeatAt: string;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  metadata?: Record<string, unknown>;
}

export interface OperationsHealth {
  marketMonitoring: EngineStatus;
  newsMonitoring: EngineStatus;
  alertEngine: EngineStatus;
  telegram: EngineStatus;
  webPush: EngineStatus;
  lastPipelineRunAt: string | null;
  workers: WorkerHeartbeat[];
  jobsProcessed: number;
  alertsGenerated: number;
  alertsSuppressed: number;
  alertsFailed: number;
  isBackgroundActive: boolean;
  hostingNote?: string;
}

export interface AlertPreferences {
  telegramEnabled: boolean;
  pushEnabled: boolean;
  minimumSeverity: AlertSeverity;
  oilAlerts: boolean;
  geopoliticalAlerts: boolean;
  macroAlerts: boolean;
  cryptoAlerts: boolean;
  equityAlerts: boolean;
}

export interface MarketIntelligenceDashboardData {
  quotes: EnrichedMarketQuote[];
  primaryQuotes: EnrichedMarketQuote[];
  brentWtiSpread: BrentWTISpread | null;
  marketEvents: MarketEvent[];
  breakingNews: NewsEvent[];
  intelligenceEvents: IntelligenceEventCluster[];
  timeline: IntelligenceEvent[];
  liveFeed: LiveFeedEntry[];
  alerts: MarketAlert[];
  intelligenceAlerts: IntelligenceAlert[];
  detectionRules: EventDetectionRule[];
  crossAssetEvents: CrossAssetCorrelationResult[];
  oilCorrelation: OilCorrelationResult | null;
  systemHealth: SystemHealth;
  deliveredAlerts?: DeliveredAlert[];
  unreadAlertCount?: number;
}

export interface EventDetectionRule {
  id: string;
  asset: string;
  symbol: string;
  condition: {
    type: "percentageChange";
    operator: ComparisonOperator;
    value: number;
  };
  windowMinutes: number;
  action: "CREATE_MARKET_EVENT";
  severity: EventSeverity;
  enabled: boolean;
}
