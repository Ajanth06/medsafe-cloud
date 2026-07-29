import type {
  AnomalyDirection,
  PriceSnapshot,
  TimeWindowMinutes,
  WindowReturnDetail,
  WindowReturns,
} from "@/lib/types/market";

export function calculatePercentageChange(startPrice: number, currentPrice: number): number {
  if (startPrice === 0) return 0;
  return ((currentPrice - startPrice) / startPrice) * 100;
}

export function getDirection(change: number): AnomalyDirection {
  if (change > 0) return "UP";
  if (change < 0) return "DOWN";
  return "UP";
}

export function calculateWindowReturn(
  snapshots: PriceSnapshot[],
  windowMinutes: TimeWindowMinutes,
  nowMs: number = Date.now(),
): WindowReturnDetail | null {
  if (snapshots.length === 0) return null;

  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const current = sorted[sorted.length - 1];
  const windowStartMs = nowMs - windowMinutes * 60_000;

  const startSnapshot =
    sorted.find((s) => new Date(s.timestamp).getTime() >= windowStartMs) ?? sorted[0];

  const absoluteChange = current.price - startSnapshot.price;
  const percentageChange = calculatePercentageChange(startSnapshot.price, current.price);

  return {
    windowMinutes,
    startPrice: startSnapshot.price,
    currentPrice: current.price,
    absoluteChange,
    percentageChange,
    direction: absoluteChange >= 0 ? "UP" : "DOWN",
  };
}

export function calculateAllWindowReturns(
  snapshots: PriceSnapshot[],
  windows: TimeWindowMinutes[],
  nowMs: number = Date.now(),
): WindowReturns {
  const returns: WindowReturns = {};

  for (const window of windows) {
    const detail = calculateWindowReturn(snapshots, window, nowMs);
    if (!detail) continue;

    const key = `m${window}` as keyof WindowReturns;
    returns[key] = detail.percentageChange;
  }

  return returns;
}

export function meetsThreshold(
  percentageChange: number,
  threshold: number,
  direction: "BOTH" | "UP" | "DOWN",
): boolean {
  const absChange = Math.abs(percentageChange);

  if (direction === "UP") return percentageChange >= threshold;
  if (direction === "DOWN") return percentageChange <= -threshold;
  return absChange >= threshold;
}
