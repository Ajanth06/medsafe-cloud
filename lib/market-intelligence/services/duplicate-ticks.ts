export interface TickKey {
  symbol: string;
  price: number;
  timestamp: string;
  eventId?: string;
}

export class DuplicateTickFilter {
  private recent = new Map<string, number>();
  private readonly ttlMs: number;

  constructor(ttlMs = 5_000) {
    this.ttlMs = ttlMs;
  }

  private key(tick: TickKey): string {
    return tick.eventId ?? `${tick.symbol}:${tick.price}:${tick.timestamp}`;
  }

  isDuplicate(tick: TickKey, nowMs: number = Date.now()): boolean {
    this.evict(nowMs);
    const k = this.key(tick);
    if (this.recent.has(k)) return true;
    this.recent.set(k, nowMs);
    return false;
  }

  private evict(nowMs: number): void {
    for (const [k, ts] of this.recent) {
      if (nowMs - ts > this.ttlMs) this.recent.delete(k);
    }
  }

  clear(): void {
    this.recent.clear();
  }
}
