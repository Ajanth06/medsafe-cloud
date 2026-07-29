import type { NormalizedNewsItem } from "@/lib/types/market";

export interface ReplayContext {
  anchorMs: number;
  newsItems: NormalizedNewsItem[];
  disableDelivery?: boolean;
  label: string;
}

let activeContext: ReplayContext | null = null;

export function setReplayContext(ctx: ReplayContext | null): void {
  activeContext = ctx;
}

export function getReplayContext(): ReplayContext | null {
  return activeContext;
}

export function getReplayNewsOverride(): NormalizedNewsItem[] | null {
  return activeContext?.newsItems ?? null;
}

export function getReplayAnchorMs(): number | null {
  return activeContext?.anchorMs ?? null;
}

export function isReplayActive(): boolean {
  return activeContext !== null;
}
