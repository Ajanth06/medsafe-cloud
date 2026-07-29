import type { AlertChannelType, DeliveredAlert } from "@/lib/types/market";

export interface AlertChannelResult {
  channel: AlertChannelType;
  success: boolean;
  status: "SENT" | "DELIVERED" | "FAILED" | "SUPPRESSED";
  error?: string;
  externalId?: string;
}

export interface AlertChannel {
  readonly type: AlertChannelType;
  isEnabled(): boolean;
  send(alert: DeliveredAlert): Promise<AlertChannelResult>;
}

export interface AlertChannelContext {
  isTest?: boolean;
}
