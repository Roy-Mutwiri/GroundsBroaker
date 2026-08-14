'use client';
import * as React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useSimulatedQuote } from '@/lib/useSimulatedQuote';
import { FlashNumber } from '@/components/ui/flash-number';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPercent, formatPrice } from '@/lib/format';

/**
 * THE SIGNATURE ELEMENT (docs/DESIGN_NOTES.md §2.4): a live XAU/USD price rail woven
 * into the hero. Real motion, labeled DEMO FEED. In Phase 2 the simulated hook is
 * swapped for the WebSocket quotes store — the visual contract stays identical.
 */
export function LiveGoldRail() {
  const digits = 2;
  const q = useSimulatedQuote(3000, digits, 20, 0.0009);
  const spread = ((q.ask - q.bid) * Math.pow(10, digits)).toFixed(0);

  // Tiny sparkline of recent mids.
  const [history, setHistory] = React.useState<number[]>([]);
  const mid = (q.bid + q.ask) / 2;
  React.useEffect(() => {
    setHistory((h) => [...h.slice(-59), mid]);
  }, [mid]);

  return (
    <div className="w-full max-w-md rounded-lg border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded border border-gold-dim bg-surface-2 text-gold">
            Au
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-text">Gold · XAU/USD</div>
            <div className="text-[11px] text-text-faint">Spot CFD</div>
          </div>
        </div>
        <Badge tone="warn" title="Prices are simulated in demo mode">
          Demo feed
        </Badge>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <FlashNumber value={mid} digits={digits} dir={q.dir} className="text-3xl px-0" />
          <div className={`mt-1 text-[13px] tnum ${q.changePct >= 0 ? 'text-up' : 'text-down'}`}>
            {formatPercent(q.changePct)} today
          </div>
        </div>
        <Sparkline points={history} up={q.changePct >= 0} />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded border border-border bg-border text-center">
        <Cell label="Sell (bid)" value={formatPrice(q.bid, digits)} tone="down" />
        <Cell label="Spread" value={`${spread} pts`} />
        <Cell label="Buy (ask)" value={formatPrice(q.ask, digits)} tone="up" />
      </div>

      <Button className="mt-4 w-full" size="lg">
        Trade gold <ArrowUpRight size={16} />
      </Button>
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: 'up' | 'down' }) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-text';
  return (
    <div className="bg-surface px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-text-faint">{label}</div>
      <div className={`tnum mt-0.5 font-mono text-[13px] ${color}`}>{value}</div>
    </div>
  );
}

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) return <div className="h-12 w-28" />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 112;
  const h = 48;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      <path d={d} fill="none" stroke={up ? 'var(--up)' : 'var(--down)'} strokeWidth={1.5} />
    </svg>
  );
}
