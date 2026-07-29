import { getOperationsConfig } from "@/lib/market-intelligence/config/operations-config";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { DeliveredAlert } from "@/lib/types/market";
import type { AlertChannel, AlertChannelResult } from "@/lib/market-intelligence/operations/channels/alert-channel";

const TELEGRAM_API = "https://api.telegram.org";

export class TelegramAlertChannel implements AlertChannel {
  readonly type = "TELEGRAM" as const;

  isEnabled(): boolean {
    const config = getOperationsConfig();
    return config.alertDeliveryEnabled && config.telegramEnabled && !!config.telegramBotToken && !!config.telegramChatId;
  }

  async send(alert: DeliveredAlert): Promise<AlertChannelResult> {
    const config = getOperationsConfig();
    if (!this.isEnabled()) {
      return { channel: "TELEGRAM", success: false, status: "SUPPRESSED", error: "Telegram not configured" };
    }

    try {
      const url = `${TELEGRAM_API}/bot${config.telegramBotToken}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.telegramChatId,
          text: alert.body,
          parse_mode: "HTML",
          disable_web_page_preview: false,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        marketLogger.error("alert_failed", { channel: "TELEGRAM", status: response.status });
        return { channel: "TELEGRAM", success: false, status: "FAILED", error: `HTTP ${response.status}: ${text.slice(0, 200)}` };
      }

      const data = (await response.json()) as { ok: boolean; result?: { message_id: number } };
      marketLogger.info("alert_sent", { channel: "TELEGRAM", alertId: alert.id });
      return {
        channel: "TELEGRAM",
        success: true,
        status: "SENT",
        externalId: data.result?.message_id != null ? String(data.result.message_id) : undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      marketLogger.error("alert_failed", { channel: "TELEGRAM", error: message });
      return { channel: "TELEGRAM", success: false, status: "FAILED", error: message };
    }
  }
}

export async function sendTestAlert(): Promise<AlertChannelResult> {
  const config = getOperationsConfig();
  const now = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });

  const testAlert: DeliveredAlert = {
    id: `test-${Date.now()}`,
    eventId: "system-test",
    severity: "INFO",
    title: "AARYX SYSTEM TEST",
    body: [
      "<b>AARYX SYSTEM TEST</b>",
      "",
      "Telegram alert channel connected successfully.",
      "",
      `Timestamp: ${now} CET`,
    ].join("\n"),
    alertType: "NEW",
    fingerprint: "system-test",
    deepLink: `${config.siteUrl}/market-intelligence`,
    readStatus: "READ",
    eventStatus: "ACTIVE",
    affectedAssets: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const channel = new TelegramAlertChannel();
  return channel.send(testAlert);
}
