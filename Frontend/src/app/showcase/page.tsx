'use client';
import * as React from 'react';
import Link from 'next/link';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, THead, Th, TRow, Td } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogTrigger, DialogContent, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { FlashNumber } from '@/components/ui/flash-number';
import { LiveGoldRail } from '@/components/marketing/live-gold-rail';
import { useSimulatedQuote } from '@/lib/useSimulatedQuote';
import { formatMoney, formatSignedMoney } from '@/lib/format';

const SWATCHES: { name: string; var: string }[] = [
  { name: 'bg', var: '--bg' },
  { name: 'surface', var: '--surface' },
  { name: 'surface-2', var: '--surface-2' },
  { name: 'border', var: '--border' },
  { name: 'gold', var: '--gold' },
  { name: 'up', var: '--up' },
  { name: 'down', var: '--down' },
  { name: 'buy', var: '--buy' },
  { name: 'sell', var: '--sell' },
];

export default function ShowcasePage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-bg/85 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/">
            <Wordmark />
          </Link>
          <Badge tone="gold">Design system</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-10">
        <div>
          <h1 className="font-display text-3xl font-semibold text-text">Aurum design system</h1>
          <p className="mt-2 max-w-2xl text-[14px] text-text-dim">
            Dark-first, gold-accented, information-dense. Green/red mean price direction and P&amp;L only; buy/sell
            buttons go blue/red. Everything numeric is tabular. Built entirely from{' '}
            <code className="text-gold">tokens.css</code>.
          </p>
        </div>

        <Section title="Palette">
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {SWATCHES.map((s) => (
              <div key={s.name} className="rounded-lg border border-border bg-surface p-3">
                <div className="h-12 w-full rounded" style={{ background: `var(${s.var})` }} />
                <div className="mt-2 text-[12px] font-medium text-text">{s.name}</div>
                <div className="text-[11px] text-text-faint">{s.var}</div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography">
          <div className="space-y-3 rounded-lg border border-border bg-surface p-6">
            <p className="font-display text-4xl font-semibold text-text">Fraunces display — gold standard</p>
            <p className="font-ui text-base text-text-dim">
              Inter UI — the workhorse for dense interfaces, crisp at 12–13px.
            </p>
            <p className="font-mono text-lg text-gold tnum">Roboto Mono — 3,000.00 · +1.24% · 0.01</p>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-6">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="buy">Buy at ask</Button>
            <Button variant="sell">Sell at bid</Button>
            <Button disabled>Disabled</Button>
            <Button size="sm">Small</Button>
            <Button size="lg">Large</Button>
          </div>
        </Section>

        <Section title="Inputs & badges">
          <div className="grid gap-6 rounded-lg border border-border bg-surface p-6 sm:grid-cols-2">
            <div className="space-y-4">
              <Field label="Email" htmlFor="sc-email" hint="We never share it.">
                <Input id="sc-email" placeholder="you@example.com" />
              </Field>
              <Field label="Amount (KES)" htmlFor="sc-amt" error="Enter at least KES 100.">
                <Input id="sc-amt" aria-invalid placeholder="0" className="font-mono tnum" />
              </Field>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="gold">Gold</Badge>
              <Badge tone="up">+2.4%</Badge>
              <Badge tone="down">−1.1%</Badge>
              <Badge tone="warn">Demo feed</Badge>
              <Badge tone="info">STP</Badge>
            </div>
          </div>
        </Section>

        <Section title="Live numbers — tick flash & tabular columns">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Watchlist (streaming demo)</CardTitle>
              </CardHeader>
              <CardBody className="p-0">
                <MiniWatchlist />
              </CardBody>
            </Card>
            <AccountBarDemo />
          </div>
        </Section>

        <Section title="Signature — Live Gold Rail">
          <div className="flex justify-center rounded-lg border border-border bg-surface p-6">
            <LiveGoldRail />
          </div>
        </Section>

        <Section title="Tabs, dialog & toast">
          <div className="rounded-lg border border-border bg-surface p-6">
            <Tabs defaultValue="positions">
              <TabsList>
                <TabsTrigger value="positions">Positions</TabsTrigger>
                <TabsTrigger value="orders">Orders</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="positions" className="pt-4 text-[13px] text-text-dim">
                No open positions — use the ticket on the right to place your first order.
              </TabsContent>
              <TabsContent value="orders" className="pt-4 text-[13px] text-text-dim">
                No pending orders.
              </TabsContent>
              <TabsContent value="history" className="pt-4 text-[13px] text-text-dim">
                Your closed trades will appear here.
              </TabsContent>
            </Tabs>

            <div className="mt-6 flex gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Open confirm dialog</Button>
                </DialogTrigger>
                <DialogContent title="Confirm order" description="Review before placing.">
                  <div className="space-y-2 text-[13px]">
                    <Row k="Instrument" v="XAU/USD" />
                    <Row k="Side" v={<span className="text-buy">Buy at ask</span>} />
                    <Row k="Volume" v="0.10 lots" />
                    <Row k="Margin required" v="$150.00" />
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button variant="ghost">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button variant="buy">Place buy order</Button>
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
              <ToastButtons />
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-widest text-text-faint">{title}</h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-1.5">
      <span className="text-text-dim">{k}</span>
      <span className="tnum font-mono text-text">{v}</span>
    </div>
  );
}

function MiniWatchlist() {
  const rows = [
    { s: 'XAUUSD', a: 3000, d: 2, sp: 20, v: 0.0009 },
    { s: 'EURUSD', a: 1.085, d: 5, sp: 6, v: 0.0004 },
    { s: 'BTCUSD', a: 64200, d: 2, sp: 5000, v: 0.0015 },
  ];
  return (
    <Table>
      <THead>
        <tr>
          <Th>Symbol</Th>
          <Th numeric>Bid</Th>
          <Th numeric>Ask</Th>
        </tr>
      </THead>
      <tbody>
        {rows.map((r) => (
          <WatchRow key={r.s} {...r} />
        ))}
      </tbody>
    </Table>
  );
}

function WatchRow({ s, a, d, sp, v }: { s: string; a: number; d: number; sp: number; v: number }) {
  const q = useSimulatedQuote(a, d, sp, v);
  return (
    <TRow>
      <Td className="font-medium text-text">{s}</Td>
      <Td numeric>
        <FlashNumber value={q.bid} digits={d} dir={q.dir} className="text-down" />
      </Td>
      <Td numeric>
        <FlashNumber value={q.ask} digits={d} dir={q.dir} className="text-up" />
      </Td>
    </TRow>
  );
}

function AccountBarDemo() {
  // Demonstrates the margin-level color state (amber 100–150%, red < stop-out 50%).
  const levels = [
    { label: 'Healthy', level: 640, tone: 'text-text' },
    { label: 'Warning', level: 138, tone: 'text-warn' },
    { label: 'Stop-out risk', level: 46, tone: 'text-danger' },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account bar — margin-level states</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3">
        {levels.map((l) => (
          <div key={l.label} className="flex items-center justify-between rounded border border-border bg-surface-2 px-3 py-2">
            <div className="text-[12px] text-text-dim">
              Equity <span className="tnum font-mono text-text">{formatMoney(10240.5)}</span> · Free{' '}
              <span className="tnum font-mono text-text">{formatMoney(9800)}</span> · P&amp;L{' '}
              <span className="tnum font-mono text-up">{formatSignedMoney(240.5)}</span>
            </div>
            <div className={`tnum font-mono text-sm font-semibold ${l.tone}`}>{l.level.toFixed(0)}%</div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function ToastButtons() {
  const { toast } = useToast();
  return (
    <>
      <Button variant="secondary" onClick={() => toast({ title: 'Order filled', description: '0.10 XAUUSD at 3,000.12', tone: 'success' })}>
        Success toast
      </Button>
      <Button variant="secondary" onClick={() => toast({ title: 'Margin insufficient', description: 'Reduce volume or add funds.', tone: 'error' })}>
        Error toast
      </Button>
    </>
  );
}
