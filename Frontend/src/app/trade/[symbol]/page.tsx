'use client';
import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Wordmark } from '@/components/brand/wordmark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { FlashNumber } from '@/components/ui/flash-number';
import { Watchlist } from '@/components/terminal/watchlist';
import { Chart } from '@/components/terminal/chart';
import { AccountBar } from '@/components/terminal/account-bar';
import { marketApi, type Instrument, type Timeframe } from '@/lib/api';
import { useQuoteSubscription } from '@/lib/ws';
import { useQuotes, selectQuote } from '@/stores/quotes';

const TIMEFRAMES: Timeframe[] = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

export default function TerminalPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = String(params.symbol ?? 'XAUUSD').toUpperCase();
  const [tf, setTf] = React.useState<Timeframe>('M1');

  const instrumentsQuery = useQuery({ queryKey: ['instruments'], queryFn: marketApi.instruments });
  const instruments = React.useMemo(() => instrumentsQuery.data ?? [], [instrumentsQuery.data]);
  const symbols = React.useMemo(() => instruments.map((i) => i.symbol), [instruments]);
  useQuoteSubscription(symbols);

  const active: Instrument | undefined = instruments.find((i) => i.symbol === symbol);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Wordmark />
          </Link>
          <Badge tone="warn">Demo feed</Badge>
        </div>
        <div className="hidden flex-1 justify-center md:flex">
          <AccountBar />
        </div>
        <div className="flex items-center gap-2">
          <CvdToggle />
          <Link href="/portal">
            <Button variant="ghost" size="sm">
              Portal
            </Button>
          </Link>
        </div>
      </header>

      {/* Main terminal grid */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[240px_1fr_300px]">
        {/* Watchlist */}
        <aside className="hidden border-r border-border md:block">
          <Watchlist instruments={instruments} selected={symbol} onSelect={(s) => router.push(`/trade/${s}`)} />
        </aside>

        {/* Chart + bottom panel */}
        <section className="flex min-w-0 flex-col">
          <ChartHeader instrument={active} symbol={symbol} tf={tf} onTf={setTf} />
          <div className="min-h-0 flex-1">
            {active ? (
              <Chart symbol={symbol} digits={active.digits} pointSize={active.pointSize} tf={tf} />
            ) : (
              <div className="grid h-full place-items-center text-[13px] text-text-faint">
                {instrumentsQuery.isLoading ? 'Loading instruments…' : 'Start the backend to load market data.'}
              </div>
            )}
          </div>
          <BottomPanel />
        </section>

        {/* Order ticket placeholder (Phase 3) */}
        <aside className="hidden border-l border-border md:block">
          <div className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
            Order ticket
          </div>
          <div className="space-y-3 p-4 text-[13px] text-text-dim">
            <p>The order ticket — buy at ask / sell at bid, lot stepper, SL/TP, live margin &amp; pip-value preview — arrives in Phase 3.</p>
            <div className="grid grid-cols-2 gap-2 opacity-50">
              <div className="rounded bg-buy/20 py-2 text-center text-buy">Buy</div>
              <div className="rounded bg-sell/20 py-2 text-center text-sell">Sell</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ChartHeader({
  instrument,
  symbol,
  tf,
  onTf,
}: {
  instrument: Instrument | undefined;
  symbol: string;
  tf: Timeframe;
  onTf: (t: Timeframe) => void;
}) {
  const q = useQuotes(selectQuote(symbol));
  const digits = instrument?.digits ?? 2;
  const spread = q && instrument ? ((q.ask - q.bid) * Math.pow(10, digits)).toFixed(0) : '—';
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
      <div className="flex items-center gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-text">{symbol}</span>
          <span className="text-[11px] text-text-faint">{instrument?.displayName}</span>
        </div>
        {q ? (
          <div className="flex items-center gap-3 text-[12px]">
            <span className="text-text-faint">Bid</span>
            <FlashNumber value={q.bid} digits={digits} dir={q.dir} className="text-down" />
            <span className="text-text-faint">Ask</span>
            <FlashNumber value={q.ask} digits={digits} dir={q.dir} className="text-up" />
            <span className="text-text-faint">Spread {spread}</span>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-0.5">
        {TIMEFRAMES.map((t) => (
          <button
            key={t}
            onClick={() => onTf(t)}
            className={`rounded-sm px-2 py-1 text-[11px] font-medium transition-colors ${
              t === tf ? 'bg-surface-2 text-gold' : 'text-text-dim hover:text-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function BottomPanel() {
  return (
    <div className="h-[180px] shrink-0 border-t border-border">
      <Tabs defaultValue="positions" className="flex h-full flex-col">
        <div className="px-3">
          <TabsList>
            <TabsTrigger value="positions">Positions</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="positions" className="flex-1 grid place-items-center text-[13px] text-text-faint">
          No open positions — the order ticket (Phase 3) will place your first trade.
        </TabsContent>
        <TabsContent value="orders" className="flex-1 grid place-items-center text-[13px] text-text-faint">
          No pending orders.
        </TabsContent>
        <TabsContent value="history" className="flex-1 grid place-items-center text-[13px] text-text-faint">
          Your closed trades will appear here.
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CvdToggle() {
  const [on, setOn] = React.useState(false);
  const toggle = () => {
    const next = !on;
    setOn(next);
    if (next) document.documentElement.setAttribute('data-cvd', 'true');
    else document.documentElement.removeAttribute('data-cvd');
  };
  return (
    <button
      onClick={toggle}
      className={`rounded-sm border px-2 py-1 text-[11px] transition-colors ${
        on ? 'border-gold-dim text-gold' : 'border-border text-text-dim hover:text-text'
      }`}
      title="Colour-blind (CVD) palette"
    >
      CVD
    </button>
  );
}
