/**
 * Market-data feed abstraction. A production broker replaces this with an LP/bridge FIX
 * feed; the interface is designed so that swap is clean. The adapter emits RAW mid prices;
 * per-instrument spread markup + rounding is applied downstream in MarketDataService.
 */

export interface FeedInstrument {
  symbol: string;
  digits: number;
  pointSize: number;
  category: string;
}

/** A raw upstream tick: a single mid price for a symbol. */
export interface RawTick {
  symbol: string;
  mid: number;
  ts: number;
}

export type TickHandler = (tick: RawTick) => void;

export interface FeedAdapter {
  /** Human-facing name, surfaced in the UI (e.g. "Simulated (demo)"). */
  readonly name: string;
  /** Begin streaming ticks for the given instruments. */
  start(instruments: FeedInstrument[], onTick: TickHandler): void;
  stop(): void;
}
