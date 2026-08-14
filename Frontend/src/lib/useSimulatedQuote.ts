'use client';
import * as React from 'react';

export interface Quote {
  bid: number;
  ask: number;
  dir: 1 | -1 | 0;
  changePct: number;
}

/**
 * DEMO-ONLY client-side quote generator (mean-reverting random walk). Exists so the
 * marketing hero + showcase show real motion before Phase 2 wires the WebSocket feed.
 * Every surface using it is labeled "DEMO FEED". Replaced by the quotes Zustand store
 * (fed by the gateway) in Phase 2 — components consume the same {bid,ask,dir} shape.
 */
export function useSimulatedQuote(anchor: number, digits: number, spreadPoints: number, volatility = 0.0006): Quote {
  const [quote, setQuote] = React.useState<Quote>(() => {
    const point = Math.pow(10, -digits);
    const spread = spreadPoints * point;
    return { bid: anchor - spread / 2, ask: anchor + spread / 2, dir: 0, changePct: 0 };
  });

  const mid = React.useRef(anchor);
  const open = React.useRef(anchor);

  React.useEffect(() => {
    const point = Math.pow(10, -digits);
    const spread = spreadPoints * point;
    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const intervalMs = reduceMotion ? 2000 : 900;

    const id = setInterval(() => {
      const shock = (Math.random() - 0.5) * 2 * volatility * anchor;
      const pull = (anchor - mid.current) * 0.02; // mean reversion
      const next = mid.current + shock + pull;
      const dir: 1 | -1 | 0 = next > mid.current ? 1 : next < mid.current ? -1 : 0;
      mid.current = next;
      const round = (v: number) => Math.round(v / point) * point;
      setQuote({
        bid: round(next - spread / 2),
        ask: round(next + spread / 2),
        dir,
        changePct: ((next - open.current) / open.current) * 100,
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [anchor, digits, spreadPoints, volatility]);

  return quote;
}
