export interface OperationsConfig {
  alertDeliveryEnabled: boolean;
  telegramEnabled: boolean;
  webPushEnabled: boolean;
  backgroundWorkersEnabled: boolean;
  marketMonitoringEnabled: boolean;
  newsMonitoringEnabled: boolean;
  aiAnalysisEnabled: boolean;
  telegramBotToken: string | null;
  telegramChatId: string | null;
  workerSecret: string | null;
  siteUrl: string;
  alertCooldownMs: number;
  minTelegramSeverity: "HIGH" | "CRITICAL";
  heartbeatStaleMs: number;
}

export const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

export const MATERIAL_CHANGE_THRESHOLDS = {
  confidenceDelta: 15,
  priceChangeDelta: 1.0,
} as const;

export function getOperationsConfig(): OperationsConfig {
  return {
    alertDeliveryEnabled: process.env.ALERT_DELIVERY_ENABLED !== "false",
    telegramEnabled: process.env.TELEGRAM_ENABLED === "true",
    webPushEnabled: process.env.WEB_PUSH_ENABLED === "true",
    backgroundWorkersEnabled: process.env.BACKGROUND_WORKERS_ENABLED !== "false",
    marketMonitoringEnabled: process.env.MARKET_MONITORING_ENABLED !== "false",
    newsMonitoringEnabled: process.env.NEWS_MONITORING_ENABLED !== "false",
    aiAnalysisEnabled: process.env.AI_ANALYSIS_ENABLED !== "false",
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? null,
    telegramChatId: process.env.TELEGRAM_CHAT_ID ?? null,
    workerSecret: process.env.WORKER_SECRET ?? process.env.CRON_SECRET ?? null,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3003",
    alertCooldownMs: Number(process.env.ALERT_COOLDOWN_MS ?? ALERT_COOLDOWN_MS),
    minTelegramSeverity: (process.env.TELEGRAM_MIN_SEVERITY as "HIGH" | "CRITICAL") ?? "HIGH",
    heartbeatStaleMs: Number(process.env.WORKER_HEARTBEAT_STALE_MS ?? 120_000),
  };
}

export function severityRank(severity: string): number {
  const ranks: Record<string, number> = {
    INFO: 0,
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  };
  return ranks[severity] ?? 0;
}

export function shouldSendTelegram(severity: string, config = getOperationsConfig()): boolean {
  return severityRank(severity) >= severityRank(config.minTelegramSeverity);
}
