import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { DeliveredAlert } from "@/lib/types/market";
import type { AlertChannel, AlertChannelResult } from "@/lib/market-intelligence/operations/channels/alert-channel";
import { addInAppAlert } from "@/lib/market-intelligence/operations/in-app-alert-store";

export class InAppAlertChannel implements AlertChannel {
  readonly type = "IN_APP" as const;

  isEnabled(): boolean {
    return true;
  }

  async send(alert: DeliveredAlert): Promise<AlertChannelResult> {
    try {
      addInAppAlert(alert);
      marketLogger.info("alert_sent", { channel: "IN_APP", alertId: alert.id });
      return { channel: "IN_APP", success: true, status: "DELIVERED" };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { channel: "IN_APP", success: false, status: "FAILED", error: message };
    }
  }
}
