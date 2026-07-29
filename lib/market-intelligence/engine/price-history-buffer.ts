import type { PriceSnapshot } from "@/lib/types/market";

const MAX_SNAPSHOTS_PER_ASSET = 120;

/**
 * In-memory price history buffer.
 * Phase 2: persist to Supabase mi_price_history for multi-instance deployments.
 */
export class PriceHistoryBuffer {
  private snapshots = new Map<string, PriceSnapshot[]>();

  addSnapshot(snapshot: PriceSnapshot): void {
    const existing = this.snapshots.get(snapshot.symbol) ?? [];
    existing.push(snapshot);

    if (existing.length > MAX_SNAPSHOTS_PER_ASSET) {
      existing.splice(0, existing.length - MAX_SNAPSHOTS_PER_ASSET);
    }

    this.snapshots.set(snapshot.symbol, existing);
  }

  addSnapshots(snapshots: PriceSnapshot[]): void {
    for (const snapshot of snapshots) {
      this.addSnapshot(snapshot);
    }
  }

  getSnapshots(symbol: string): PriceSnapshot[] {
    return [...(this.snapshots.get(symbol) ?? [])];
  }

  getAllSnapshots(): Map<string, PriceSnapshot[]> {
    return new Map(this.snapshots);
  }

  clear(): void {
    this.snapshots.clear();
  }
}

let globalBuffer: PriceHistoryBuffer | null = null;

export function getPriceHistoryBuffer(): PriceHistoryBuffer {
  if (!globalBuffer) {
    globalBuffer = new PriceHistoryBuffer();
  }
  return globalBuffer;
}

export function resetPriceHistoryBuffer(): void {
  globalBuffer = new PriceHistoryBuffer();
}
