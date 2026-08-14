'use client';
import * as React from 'react';
import {
  createChart,
  ColorType,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
  type CandlestickData,
} from 'lightweight-charts';
import { useQuotes } from '@/stores/quotes';
import { marketApi, type Timeframe } from '@/lib/api';

const TF_SECONDS: Record<Timeframe, number> = {
  M1: 60,
  M5: 300,
  M15: 900,
  M30: 1800,
  H1: 3600,
  H4: 14400,
  D1: 86400,
};

/**
 * Candlestick chart. Loads REST history, then builds the forming candle from live quotes
 * imperatively (series.update — never React state per tick), so it survives refresh with
 * history + live continuation. Driven entirely through the lightweight-charts API.
 */
export function Chart({ symbol, digits, pointSize, tf }: { symbol: string; digits: number; pointSize: number; tf: Timeframe }) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;

    const chart: IChartApi = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9aa3b2',
        fontFamily: 'var(--font-ui)',
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(35,41,54,0.5)' },
        horzLines: { color: 'rgba(35,41,54,0.5)' },
      },
      rightPriceScale: { borderColor: '#232936' },
      timeScale: { borderColor: '#232936', timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
      autoSize: true,
    });

    const series: ISeriesApi<'Candlestick'> = chart.addSeries(CandlestickSeries, {
      upColor: '#2ebd85',
      downColor: '#f0616e',
      borderUpColor: '#2ebd85',
      borderDownColor: '#f0616e',
      wickUpColor: '#2ebd85',
      wickDownColor: '#f0616e',
      priceFormat: { type: 'price', precision: digits, minMove: pointSize },
    });

    const tfSec = TF_SECONDS[tf];
    let lastBar: CandlestickData<UTCTimestamp> | null = null;

    marketApi
      .candles(symbol, tf, 500)
      .then((res) => {
        if (cancelled) return;
        const data = res.candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        series.setData(data);
        lastBar = data.length ? data[data.length - 1] : null;
        chart.timeScale().fitContent();
      })
      .catch(() => {
        /* backend offline — empty chart */
      });

    // Live forming candle from the quotes store (imperative subscription, no React re-render).
    const unsub = useQuotes.subscribe((state) => {
      const q = state.quotes[symbol];
      if (!q) return;
      const mid = (q.bid + q.ask) / 2;
      const bucket = (Math.floor(q.ts / 1000 / tfSec) * tfSec) as UTCTimestamp;
      if (!lastBar || bucket > lastBar.time) {
        lastBar = { time: bucket, open: mid, high: mid, low: mid, close: mid };
      } else if (bucket === lastBar.time) {
        lastBar = {
          time: bucket,
          open: lastBar.open,
          high: Math.max(lastBar.high, mid),
          low: Math.min(lastBar.low, mid),
          close: mid,
        };
      } else {
        return; // out-of-order tick
      }
      series.update(lastBar);
    });

    return () => {
      cancelled = true;
      unsub();
      chart.remove();
    };
  }, [symbol, digits, pointSize, tf]);

  return <div ref={containerRef} className="h-full w-full" />;
}
