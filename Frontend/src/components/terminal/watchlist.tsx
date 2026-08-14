'use client';
import * as React from 'react';
import { Search } from 'lucide-react';
import { useQuotes, selectQuote } from '@/stores/quotes';
import { FlashNumber } from '@/components/ui/flash-number';
import { cn } from '@/lib/cn';
import type { Instrument } from '@/lib/api';

export function Watchlist({
  instruments,
  selected,
  onSelect,
}: {
  instruments: Instrument[];
  selected: string;
  onSelect: (symbol: string) => void;
}) {
  const [query, setQuery] = React.useState('');
  const filtered = React.useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return instruments;
    return instruments.filter((i) => i.symbol.includes(q) || i.displayName.toUpperCase().includes(q));
  }, [instruments, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbols…"
            className="h-8 w-full rounded border border-border bg-surface-2 pl-8 pr-2 text-[12px] text-text placeholder:text-text-faint focus-visible:border-gold-dim focus-visible:outline-none"
          />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 border-b border-border px-3 py-1.5 text-[10px] uppercase tracking-wide text-text-faint">
        <span>Symbol</span>
        <span className="text-right">Bid</span>
        <span className="text-right">Ask</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((i) => (
          <WatchRow key={i.symbol} instrument={i} active={i.symbol === selected} onSelect={onSelect} />
        ))}
        {filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-[12px] text-text-faint">No matches.</p>
        ) : null}
      </div>
    </div>
  );
}

function WatchRow({
  instrument,
  active,
  onSelect,
}: {
  instrument: Instrument;
  active: boolean;
  onSelect: (s: string) => void;
}) {
  const q = useQuotes(selectQuote(instrument.symbol));
  const changePct = q ? ((q.bid - q.open) / (q.open || 1)) * 100 : 0;
  const spread = q ? ((q.ask - q.bid) * Math.pow(10, instrument.digits)).toFixed(0) : '';

  return (
    <button
      onClick={() => onSelect(instrument.symbol)}
      className={cn(
        'grid w-full grid-cols-[1fr_auto_auto] items-center gap-x-2 border-b border-border/50 px-3 py-1.5 text-left',
        'h-[36px] border-l-2 transition-colors hover:bg-surface-2',
        active ? 'border-l-gold bg-surface-2' : 'border-l-transparent',
      )}
    >
      <span className="min-w-0">
        <span className={cn('block truncate text-[12px] font-medium', active ? 'text-gold' : 'text-text')}>
          {instrument.symbol}
        </span>
        <span className="flex items-center gap-1.5 text-[10px]">
          <span className={changePct >= 0 ? 'tnum text-up' : 'tnum text-down'}>
            {q ? `${changePct >= 0 ? '+' : '−'}${Math.abs(changePct).toFixed(2)}%` : '—'}
          </span>
          {spread ? <span className="tnum text-text-faint">· {spread}pt</span> : null}
        </span>
      </span>
      {q ? (
        <FlashNumber value={q.bid} digits={instrument.digits} dir={q.dir} className="justify-self-end text-[12px] text-down" />
      ) : (
        <span className="justify-self-end text-[12px] text-text-faint">—</span>
      )}
      {q ? (
        <FlashNumber value={q.ask} digits={instrument.digits} dir={q.dir} className="justify-self-end text-[12px] text-up" />
      ) : (
        <span className="justify-self-end text-[12px] text-text-faint">—</span>
      )}
    </button>
  );
}
