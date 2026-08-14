import { Logger } from '@nestjs/common';
import { anchorFor } from './anchors';
import { FeedAdapter, FeedInstrument, TickHandler } from './feed-adapter';

/**
 * DEMO feed: a mean-reverting random walk per instrument, with occasional volatility
 * bursts and weekend market closures (crypto trades 24/7; FX/metals/indices are closed
 * Sat/Sun UTC and simply hold their last price). Clearly labelled "Simulated (demo)".
 * Emits ~5 ticks/sec/symbol so the gateway's ≤4/sec coalescing is exercised.
 */
export class SimulatedFeed implements FeedAdapter {
  readonly name = 'Simulated (demo)';
  private readonly logger = new Logger('SimulatedFeed');
  private timer: NodeJS.Timeout | null = null;
  private readonly state = new Map<string, { mid: number; anchor: number; vol: number }>();
  private instruments: FeedInstrument[] = [];

  start(instruments: FeedInstrument[], onTick: TickHandler): void {
    this.instruments = instruments;
    for (const i of instruments) {
      const a = anchorFor(i.symbol);
      this.state.set(i.symbol, { mid: a.price, anchor: a.price, vol: a.vol });
    }
    const TICK_MS = 200; // 5 ticks/sec/symbol
    this.timer = setInterval(() => {
      const now = Date.now();
      const closed = this.marketsClosed(now);
      for (const inst of this.instruments) {
        if (closed && inst.category !== 'CRYPTO') continue; // hold last price when closed
        const s = this.state.get(inst.symbol);
        if (!s) continue;
        const burst = Math.random() < 0.03 ? 4 : 1; // occasional volatility burst
        const shock = (Math.random() - 0.5) * 2 * s.vol * burst * s.anchor;
        const pull = (s.anchor - s.mid) * 0.015; // mean reversion
        s.mid = Math.max(s.mid + shock + pull, s.anchor * 0.2);
        onTick({ symbol: inst.symbol, mid: s.mid, ts: now });
      }
    }, TICK_MS);
    this.logger.log(`Started — ${instruments.length} instruments @ ${TICK_MS}ms`);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** FX/metals/indices are closed on weekends (UTC). Rough: Sat all day + Sun before 22:00. */
  private marketsClosed(now: number): boolean {
    const d = new Date(now);
    const day = d.getUTCDay(); // 0 Sun .. 6 Sat
    if (day === 6) return true;
    if (day === 0 && d.getUTCHours() < 22) return true;
    if (day === 5 && d.getUTCHours() >= 22) return true; // Fri after NY close
    return false;
  }
}
