'use client';
import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, THead, Th, TRow, Td } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FlashNumber } from '@/components/ui/flash-number';
import { marketApi, type Instrument } from '@/lib/api';
import { useQuoteSubscription } from '@/lib/ws';
import { useQuotes, selectQuote } from '@/stores/quotes';
import { formatPercent } from '@/lib/format';

const GROUPS: { key: Instrument['category']; label: string }[] = [
  { key: 'METAL', label: 'Metals' },
  { key: 'FX_MAJOR', label: 'Forex — Majors' },
  { key: 'FX_MINOR', label: 'Forex — Minors' },
  { key: 'INDEX', label: 'Indices' },
  { key: 'CRYPTO', label: 'Crypto' },
];

export function InstrumentsExplorer() {
  const q = useQuery({ queryKey: ['instruments'], queryFn: marketApi.instruments });
  const instruments = React.useMemo(() => q.data ?? [], [q.data]);
  const symbols = React.useMemo(() => instruments.map((i) => i.symbol), [instruments]);
  useQuoteSubscription(symbols);

  if (q.isLoading) return <p className="text-[13px] text-text-faint">Loading live instruments…</p>;
  if (!instruments.length) return <p className="text-[13px] text-text-faint">Start the platform to load instruments.</p>;

  return (
    <div className="space-y-8">
      {GROUPS.map((g) => {
        const rows = instruments.filter((i) => i.category === g.key);
        if (!rows.length) return null;
        return (
          <div key={g.key} className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="border-b border-border px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wide text-gold">
              {g.label}
            </div>
            <Table>
              <THead>
                <tr>
                  <Th>Instrument</Th>
                  <Th numeric>Sell</Th>
                  <Th numeric>Buy</Th>
                  <Th numeric>Spread</Th>
                  <Th numeric>Change</Th>
                  <Th numeric>Leverage</Th>
                  <Th numeric>Contract</Th>
                </tr>
              </THead>
              <tbody>
                {rows.map((i) => (
                  <InstrumentRow key={i.symbol} inst={i} />
                ))}
              </tbody>
            </Table>
          </div>
        );
      })}
      <p className="text-[12px] text-text-faint">
        Prices stream on a live demo feed. Spread shown in points. Swap and margin details are available in each
        account&apos;s contract specifications.
      </p>
    </div>
  );
}

function InstrumentRow({ inst }: { inst: Instrument }) {
  const quote = useQuotes(selectQuote(inst.symbol));
  const spread = quote ? ((quote.ask - quote.bid) * Math.pow(10, inst.digits)).toFixed(0) : '—';
  const changePct = quote ? ((quote.bid - quote.open) / (quote.open || 1)) * 100 : 0;
  return (
    <TRow>
      <Td>
        <div className="flex items-center gap-2">
          <span className="font-medium text-text">{inst.symbol}</span>
          <span className="text-text-faint">{inst.displayName}</span>
        </div>
      </Td>
      <Td numeric>{quote ? <FlashNumber value={quote.bid} digits={inst.digits} dir={quote.dir} className="text-down" /> : '—'}</Td>
      <Td numeric>{quote ? <FlashNumber value={quote.ask} digits={inst.digits} dir={quote.dir} className="text-up" /> : '—'}</Td>
      <Td numeric className="text-text-dim">{spread}</Td>
      <Td numeric className={changePct >= 0 ? 'text-up' : 'text-down'}>{quote ? formatPercent(changePct) : '—'}</Td>
      <Td numeric className="text-text-dim">1:{inst.leverageCap}</Td>
      <Td numeric className="text-text-faint">{inst.contractSize.toLocaleString()}</Td>
    </TRow>
  );
}
