/** Demo anchors for marketing/showcase streaming tables (replaced by live feed in Phase 2). */
export interface DemoInstrument {
  symbol: string;
  name: string;
  anchor: number;
  digits: number;
  spreadPoints: number;
  volatility: number;
}

export const DEMO_INSTRUMENTS: DemoInstrument[] = [
  { symbol: 'XAUUSD', name: 'Gold', anchor: 3000, digits: 2, spreadPoints: 20, volatility: 0.0009 },
  { symbol: 'EURUSD', name: 'Euro / US Dollar', anchor: 1.0850, digits: 5, spreadPoints: 6, volatility: 0.0004 },
  { symbol: 'GBPUSD', name: 'Pound / US Dollar', anchor: 1.2720, digits: 5, spreadPoints: 9, volatility: 0.0005 },
  { symbol: 'USDJPY', name: 'US Dollar / Yen', anchor: 152.30, digits: 3, spreadPoints: 8, volatility: 0.0004 },
  { symbol: 'NAS100', name: 'Nasdaq 100', anchor: 18450.0, digits: 1, spreadPoints: 10, volatility: 0.0007 },
  { symbol: 'BTCUSD', name: 'Bitcoin', anchor: 64200, digits: 2, spreadPoints: 5000, volatility: 0.0015 },
];
