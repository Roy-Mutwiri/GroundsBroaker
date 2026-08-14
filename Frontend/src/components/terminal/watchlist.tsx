'use client';
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
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-faint">Watchlist</span>
        <span className="text-[10px] text-text-faint">{instruments.length} symbols</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 border-b border-border px-3 py-1.5 text-[10px] uppercase tracking-wide text-text-faint">
        <span>Symbol</span>
        <span className="text-right">Bid</span>
        <span className="text-right">Ask</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {instruments.map((i) => (
          <WatchRow key={i.symbol} instrument={i} active={i.symbol === selected} onSelect={onSelect} />
        ))}
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

  return (
    <button
      onClick={() => onSelect(instrument.symbol)}
      className={cn(
        'grid w-full grid-cols-[1fr_auto_auto] items-center gap-x-2 border-b border-border/50 px-3 py-1.5 text-left',
        'h-[34px] transition-colors hover:bg-surface-2',
        active && 'bg-surface-2',
      )}
    >
      <span className="min-w-0">
        <span className={cn('block truncate text-[12px] font-medium', active ? 'text-gold' : 'text-text')}>
          {instrument.symbol}
        </span>
        <span className={cn('tnum text-[10px]', changePct >= 0 ? 'text-up' : 'text-down')}>
          {q ? `${changePct >= 0 ? '+' : '−'}${Math.abs(changePct).toFixed(2)}%` : '—'}
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
