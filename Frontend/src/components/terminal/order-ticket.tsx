'use client';
import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { FlashNumber } from '@/components/ui/flash-number';
import { useQuotes, selectQuote } from '@/stores/quotes';
import { tradingApi, ApiError, type Instrument, type TradingAccount } from '@/lib/api';
import { formatMoney } from '@/lib/format';

export function OrderTicket({ account, instrument }: { account: TradingAccount; instrument: Instrument }) {
  const { toast } = useToast();
  const q = useQuotes(selectQuote(instrument.symbol));
  const [lots, setLots] = React.useState(0.1);
  const [sl, setSl] = React.useState('');
  const [tp, setTp] = React.useState('');
  const [pending, setPending] = React.useState<null | 'BUY' | 'SELL'>(null);

  const mid = q ? (q.bid + q.ask) / 2 : 0;
  const notional = lots * instrument.contractSize * mid;
  const margin = notional / account.leverage; // convRate≈1 for USD-quoted instruments
  const pip = lots * instrument.contractSize * instrument.pipSize;

  const place = useMutation({
    mutationFn: (side: 'BUY' | 'SELL') =>
      tradingApi.placeOrder({
        accountId: account.id,
        symbol: instrument.symbol,
        side,
        kind: 'MARKET',
        lots,
        stopLoss: sl ? Number(sl) : undefined,
        takeProfit: tp ? Number(tp) : undefined,
      }),
    onSuccess: (res, side) => {
      setPending(null);
      toast({ title: `${side === 'BUY' ? 'Buy' : 'Sell'} order filled`, description: `${lots} ${instrument.symbol} @ ${res.price}`, tone: 'success' });
    },
    onError: (e) => {
      setPending(null);
      toast({ title: 'Order rejected', description: e instanceof ApiError ? e.message : 'Try again.', tone: 'error' });
    },
  });

  const step = instrument.lotStep;
  const adjust = (d: number) => setLots((v) => Math.max(instrument.minLot, Math.min(instrument.maxLot, Number((v + d).toFixed(2)))));
  const noQuote = !q;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
        Order ticket · {instrument.symbol}
      </div>
      <div className="space-y-4 p-4">
        {/* Buy/Sell with live prices */}
        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={noQuote}
            onClick={() => setPending('SELL')}
            className="flex flex-col items-center rounded bg-sell/15 py-2.5 transition-colors hover:bg-sell/25 disabled:opacity-40"
          >
            <span className="text-[10px] uppercase tracking-wide text-sell">Sell · bid</span>
            {q ? <FlashNumber value={q.bid} digits={instrument.digits} dir={q.dir} className="text-sell" /> : <span className="text-text-faint">—</span>}
          </button>
          <button
            disabled={noQuote}
            onClick={() => setPending('BUY')}
            className="flex flex-col items-center rounded bg-buy/15 py-2.5 transition-colors hover:bg-buy/25 disabled:opacity-40"
          >
            <span className="text-[10px] uppercase tracking-wide text-buy">Buy · ask</span>
            {q ? <FlashNumber value={q.ask} digits={instrument.digits} dir={q.dir} className="text-buy" /> : <span className="text-text-faint">—</span>}
          </button>
        </div>

        {/* Lots stepper */}
        <div>
          <label className="mb-1 block text-[11px] uppercase tracking-wide text-text-faint">Volume (lots)</label>
          <div className="flex items-center gap-2">
            <button onClick={() => adjust(-step)} className="grid h-9 w-9 place-items-center rounded border border-border text-text-dim hover:text-text">
              <Minus size={14} />
            </button>
            <input
              value={lots}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) setLots(v);
              }}
              className="h-9 w-full rounded border border-border bg-surface-2 text-center font-mono tnum text-sm text-text"
              inputMode="decimal"
            />
            <button onClick={() => adjust(step)} className="grid h-9 w-9 place-items-center rounded border border-border text-text-dim hover:text-text">
              <Plus size={14} />
            </button>
          </div>
          <p className="mt-1 text-[10px] text-text-faint">
            min {instrument.minLot} · step {instrument.lotStep} · max {instrument.maxLot}
          </p>
        </div>

        {/* SL / TP */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wide text-text-faint">Stop loss</label>
            <input value={sl} onChange={(e) => setSl(e.target.value)} placeholder="price" className="h-9 w-full rounded border border-border bg-surface-2 px-2 font-mono tnum text-[13px] text-text placeholder:text-text-faint" inputMode="decimal" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-wide text-text-faint">Take profit</label>
            <input value={tp} onChange={(e) => setTp(e.target.value)} placeholder="price" className="h-9 w-full rounded border border-border bg-surface-2 px-2 font-mono tnum text-[13px] text-text placeholder:text-text-faint" inputMode="decimal" />
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-1.5 rounded border border-border bg-surface-2 p-3 text-[12px]">
          <Row k="Margin required" v={formatMoney(margin)} />
          <Row k="Pip value" v={formatMoney(pip)} />
          <Row k="Contract size" v={`${instrument.contractSize} ${instrument.baseCurrency}`} />
          <Row k="Leverage" v={`1:${account.leverage}`} />
        </div>
        {noQuote ? <p className="text-center text-[12px] text-warn">Waiting for a live price…</p> : null}
      </div>

      {/* Confirm dialog */}
      <Dialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        {pending ? (
          <DialogContent title={`Confirm ${pending === 'BUY' ? 'buy' : 'sell'} order`} description="Placed at the live market price.">
            <div className="space-y-2 text-[13px]">
              <Row k="Instrument" v={instrument.symbol} />
              <Row k="Side" v={<span className={pending === 'BUY' ? 'text-buy' : 'text-sell'}>{pending === 'BUY' ? 'Buy at ask' : 'Sell at bid'}</span>} />
              <Row k="Volume" v={`${lots} lots`} />
              <Row k="Price" v={q ? (pending === 'BUY' ? q.ask : q.bid).toFixed(instrument.digits) : '—'} />
              <Row k="Margin required" v={formatMoney(margin)} />
              {sl ? <Row k="Stop loss" v={sl} /> : null}
              {tp ? <Row k="Take profit" v={tp} /> : null}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button variant={pending === 'BUY' ? 'buy' : 'sell'} disabled={place.isPending} onClick={() => place.mutate(pending)}>
                {place.isPending ? 'Placing…' : `Place ${pending === 'BUY' ? 'buy' : 'sell'} order`}
              </Button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-dim">{k}</span>
      <span className="tnum font-mono text-text">{v}</span>
    </div>
  );
}
