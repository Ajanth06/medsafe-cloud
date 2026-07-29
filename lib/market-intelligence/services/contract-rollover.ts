import type { FuturesContractInfo } from "@/lib/types/market";

export interface RolloverState {
  previousContract: string | null;
  currentContract: string;
  rolloverDetected: boolean;
  priceGapPercent: number | null;
}

const rolloverState = new Map<string, RolloverState>();

export function detectContractRollover(
  symbol: string,
  contract: FuturesContractInfo,
  newPrice: number,
  previousPrice?: number,
): RolloverState {
  const prev = rolloverState.get(symbol);
  const contractChanged =
    prev !== undefined && prev.currentContract !== contract.contractSymbol;

  let priceGapPercent: number | null = null;
  if (contractChanged && previousPrice && previousPrice > 0) {
    priceGapPercent = ((newPrice - previousPrice) / previousPrice) * 100;
  }

  const rolloverDetected =
    contractChanged && priceGapPercent !== null && Math.abs(priceGapPercent) > 2;

  const state: RolloverState = {
    previousContract: prev?.currentContract ?? null,
    currentContract: contract.contractSymbol,
    rolloverDetected,
    priceGapPercent,
  };

  rolloverState.set(symbol, state);
  return state;
}

export function shouldSuppressAnomalyDuringRollover(symbol: string): boolean {
  const state = rolloverState.get(symbol);
  return state?.rolloverDetected ?? false;
}

export function resetRolloverState(): void {
  rolloverState.clear();
}
