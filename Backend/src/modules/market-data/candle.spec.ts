import { describe, expect, it } from 'vitest';
import { aggregateCandles, type Candle } from './candle.service';

/** Build N consecutive 1m candles starting at t0 (unix seconds). */
function m1(t0: number, closes: number[]): Candle[] {
  return closes.map((c, i) => ({
    time: t0 + i * 60,
    open: c - 0.5,
    high: c + 1,
    low: c - 1,
    close: c,
    volume: 10,
  }));
}

describe('market-data/aggregateCandles', () => {
  const t0 = 1_700_000_000 - (1_700_000_000 % 300); // aligned to 5m boundary

  it('returns M1 untouched', () => {
    const data = m1(t0, [1, 2, 3]);
    expect(aggregateCandles(data, 1)).toEqual(data);
  });

  it('rolls five 1m candles into one 5m candle (O=first,H=max,L=min,C=last,V=sum)', () => {
    const data = m1(t0, [10, 12, 9, 11, 13]);
    const out = aggregateCandles(data, 5);
    expect(out).toHaveLength(1);
    expect(out[0].time).toBe(t0);
    expect(out[0].open).toBe(data[0].open); // first open
    expect(out[0].close).toBe(13); // last close
    expect(out[0].high).toBe(14); // max high (13+1)
    expect(out[0].low).toBe(8); // min low (9-1)
    expect(out[0].volume).toBe(50); // sum
  });

  it('splits across timeframe boundaries', () => {
    const data = m1(t0, [1, 2, 3, 4, 5, 6, 7]); // 7 minutes -> two 5m buckets
    const out = aggregateCandles(data, 5);
    expect(out).toHaveLength(2);
    expect(out[0].time).toBe(t0);
    expect(out[1].time).toBe(t0 + 300);
    expect(out[1].close).toBe(7);
  });

  it('handles an empty series', () => {
    expect(aggregateCandles([], 15)).toEqual([]);
  });
});
