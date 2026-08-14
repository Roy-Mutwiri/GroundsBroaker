import { create } from 'zustand';

export interface Quote {
  bid: number;
  ask: number;
  dir: 1 | -1 | 0;
  ts: number;
  open: number; // first price seen this session — for a demo daily-change %
}

export interface QuoteFrame {
  t: number;
  s: string;
  b: number;
  a: number;
}

interface QuotesState {
  quotes: Record<string, Quote>;
  apply: (frames: QuoteFrame[]) => void;
}

/**
 * Realtime quote store — lives OUTSIDE React render. The gateway already coalesces to
 * ≤4/sec/symbol, so applying each flush here is cheap. Components subscribe to their own
 * symbol slice; the chart reads via getState()/subscribe() imperatively (never per-tick React state).
 */
export const useQuotes = create<QuotesState>((set) => ({
  quotes: {},
  apply: (frames) =>
    set((state) => {
      const next = { ...state.quotes };
      for (const f of frames) {
        const prev = next[f.s];
        const dir: 1 | -1 | 0 = prev ? (f.b > prev.bid ? 1 : f.b < prev.bid ? -1 : prev.dir) : 0;
        next[f.s] = { bid: f.b, ask: f.a, dir, ts: f.t, open: prev?.open ?? f.b };
      }
      return { quotes: next };
    }),
}));

export const selectQuote = (symbol: string) => (s: QuotesState) => s.quotes[symbol];
