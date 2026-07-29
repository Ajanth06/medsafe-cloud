import { getOperationsConfig } from "@/lib/market-intelligence/config/operations-config";
import type { DeliveredAlert } from "@/lib/types/market";
import type { AlertChannel, AlertChannelResult } from "@/lib/market-intelligence/operations/channels/alert-channel";

/** Web Push channel stub — subscription storage prepared for Phase 7. */
export class WebPushAlertChannel implements AlertChannel {
  readonly type = "WEB_PUSH" as const;

  isEnabled(): boolean {
    const config = getOperationsConfig();
    return config.alertDeliveryEnabled && config.webPushEnabled;
  }

  async send(): Promise<AlertChannelResult> {
    if (!this.isEnabled()) {
      return { channel: "WEB_PUSH", success: false, status: "SUPPRESSED", error: "Web push not enabled" };
    }
    return {
      channel: "WEB_PUSH",
      success: false,
      status: "SUPPRESSED",
      error: "Web push subscriptions not configured — enable in Phase 7",
    };
  }
}

export interface WebPushSubscriptionRecord {
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
}

const subscriptions = new Map<string, WebPushSubscriptionRecord>();

export function storeWebPushSubscription(record: WebPushSubscriptionRecord): void {
  subscriptions.set(record.userId, record);
}

export function removeWebPushSubscription(userId: string): void {
  subscriptions.delete(userId);
}

export function getWebPushSubscriptions(): WebPushSubscriptionRecord[] {
  return [...subscriptions.values()];
}
