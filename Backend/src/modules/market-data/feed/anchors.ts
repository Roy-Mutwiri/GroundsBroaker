/** Anchor (reference) prices + per-symbol volatility for the SimulatedFeed. Demo only. */
export interface Anchor {
  price: number;
  vol: number; // relative per-tick volatility
}

export const ANCHORS: Record<string, Anchor> = {
  EURUSD: { price: 1.085, vol: 0.0004 },
  GBPUSD: { price: 1.272, vol: 0.0005 },
  USDJPY: { price: 152.3, vol: 0.0004 },
  USDCHF: { price: 0.882, vol: 0.0004 },
  USDCAD: { price: 1.362, vol: 0.0004 },
  AUDUSD: { price: 0.658, vol: 0.0005 },
  NZDUSD: { price: 0.602, vol: 0.0005 },
  EURGBP: { price: 0.853, vol: 0.0004 },
  EURJPY: { price: 165.2, vol: 0.0005 },
  GBPJPY: { price: 193.7, vol: 0.0006 },
  EURCHF: { price: 0.957, vol: 0.0004 },
  AUDJPY: { price: 100.2, vol: 0.0006 },
  EURAUD: { price: 1.649, vol: 0.0005 },
  GBPAUD: { price: 1.933, vol: 0.0006 },
  CADJPY: { price: 111.8, vol: 0.0005 },
  XAUUSD: { price: 3000, vol: 0.0009 },
  XAGUSD: { price: 34.5, vol: 0.0012 },
  US500: { price: 5620, vol: 0.0006 },
  NAS100: { price: 18450, vol: 0.0007 },
  BTCUSD: { price: 64200, vol: 0.0015 },
  ETHUSD: { price: 3350, vol: 0.0016 },
};

export function anchorFor(symbol: string): Anchor {
  return ANCHORS[symbol] ?? { price: 100, vol: 0.0006 };
}
