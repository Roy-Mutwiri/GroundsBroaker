import Link from 'next/link';
import { ArrowRight, ShieldCheck, Smartphone, LineChart, Layers, Zap, Coins } from 'lucide-react';
import { MarketingShell, SectionHeading } from '@/components/marketing/marketing-shell';
import { LiveGoldRail } from '@/components/marketing/live-gold-rail';
import { InstrumentTable } from '@/components/marketing/instrument-table';
import { StatsBand } from '@/components/marketing/stats-band';
import { AccountTypes } from '@/components/marketing/account-types';
import { FundingSection } from '@/components/marketing/funding-section';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <Badge tone="gold" className="mb-5">
            Gold-first · Kenya
          </Badge>
          <h1 className="font-display text-[2.6rem] font-semibold leading-[1.08] tracking-tight text-text md:text-6xl">
            Trade gold the way <span className="text-gold">the desk does.</span>
          </h1>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-text-dim">
            XAUUSD and global markets on a fast, honest terminal. Fund instantly with M-Pesa, keep your costs
            transparent, and practise risk-free in demo mode.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register">
              <Button size="lg">
                Open demo account <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/trade/XAUUSD">
              <Button size="lg" variant="secondary">
                Launch terminal
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-text-faint">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-gold" /> No deposit needed
            </span>
            <span className="flex items-center gap-1.5">
              <Coins size={14} className="text-gold" /> $10,000 demo balance
            </span>
            <span className="flex items-center gap-1.5">
              <Smartphone size={14} className="text-gold" /> M-Pesa funding
            </span>
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          <LiveGoldRail />
        </div>
      </section>

      <StatsBand />

      {/* Live markets */}
      <section id="markets" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-6 flex items-end justify-between">
          <SectionHeading eyebrow="Live markets" title="Real prices, streaming now" subtitle="Spreads shown in points on a live demo feed. Gold leads — as it should." />
          <Badge tone="warn" className="hidden sm:inline-flex">
            Demo feed
          </Badge>
        </div>
        <Card>
          <CardBody className="p-0">
            <InstrumentTable />
          </CardBody>
        </Card>
        <div className="mt-4 text-right">
          <Link href="/instruments" className="inline-flex items-center gap-1 text-[13px] text-gold hover:underline">
            See all instruments & specs <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Terminal feature */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 md:grid-cols-2">
          <div>
            <SectionHeading eyebrow="The terminal" title="A dense, dark desk tuned for XAUUSD" subtitle="Real-time charts, a live watchlist, and an order ticket that shows margin and pip value before you commit. Green and red mean price and P&L — nothing else." />
            <div className="mt-6 grid grid-cols-2 gap-4">
              <MiniFeature icon={<LineChart size={16} />} title="Live charts" body="History + live candles, M1–D1." />
              <MiniFeature icon={<Zap size={16} />} title="Fast execution" body="Buy at ask, sell at bid, instant fills." />
              <MiniFeature icon={<ShieldCheck size={16} />} title="Real risk engine" body="Margin call & stop-out, server-side." />
              <MiniFeature icon={<Layers size={16} />} title="One account" body="FX, metals, indices & crypto." />
            </div>
            <Link href="/trade/XAUUSD" className="mt-7 inline-block">
              <Button>
                Open the terminal <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
          <TerminalPreview />
        </div>
      </section>

      {/* Account types */}
      <section id="accounts" className="mx-auto max-w-6xl px-4 py-20">
        <SectionHeading center eyebrow="Accounts" title="Two ways to trade gold" subtitle="Start commission-free on Standard, or go raw on Gold for the tightest spreads. Both fund in KES or USD." />
        <div className="mt-10">
          <AccountTypes />
        </div>
      </section>

      {/* Funding */}
      <section id="funding" className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <SectionHeading eyebrow="Funding" title="Deposit with M-Pesa in seconds" subtitle="Enter an amount, approve the STK prompt on your phone, and your wallet is credited instantly — no broker fee." />
          <div className="mt-10">
            <FundingSection />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="rounded-lg border border-gold-dim bg-surface p-10 text-center">
          <h2 className="font-display text-3xl font-semibold text-text">Ready to trade gold?</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-text-dim">
            Open a free demo account with a $10,000 balance and place your first XAUUSD trade in minutes.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Link href="/register">
              <Button size="lg">Open demo account</Button>
            </Link>
            <Link href="/trade/XAUUSD">
              <Button size="lg" variant="secondary">
                Explore the terminal
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

function MiniFeature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div>
      <div className="mb-2 grid h-8 w-8 place-items-center rounded border border-gold-dim bg-surface-2 text-gold">{icon}</div>
      <h3 className="text-[14px] font-semibold text-text">{title}</h3>
      <p className="text-[12px] text-text-dim">{body}</p>
    </div>
  );
}

/** A static, on-brand mock of the terminal chrome (no live deps — decorative). */
function TerminalPreview() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="font-semibold text-text">XAUUSD</span>
          <span className="text-text-faint">Gold vs US Dollar</span>
        </div>
        <div className="flex gap-1 text-[10px]">
          {['M1', 'M5', 'H1', 'D1'].map((t, i) => (
            <span key={t} className={i === 1 ? 'rounded-sm bg-surface-2 px-1.5 py-0.5 text-gold' : 'px-1.5 py-0.5 text-text-faint'}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto]">
        <div className="relative h-48 border-r border-border">
          <svg viewBox="0 0 300 190" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
            {[40, 80, 120, 160].map((y) => (
              <line key={y} x1="0" y1={y} x2="300" y2={y} stroke="rgba(35,41,54,0.6)" />
            ))}
            <polyline points="0,140 30,120 60,130 90,90 120,110 150,70 180,80 210,50 240,60 270,35 300,45" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
            {[[60, 130, 8], [150, 70, 10], [210, 50, 7], [270, 35, 9]].map(([x, y, h], i) => (
              <rect key={i} x={x - 2} y={y - h} width="4" height={h * 2} fill={i % 2 ? 'var(--up)' : 'var(--down)'} />
            ))}
          </svg>
        </div>
        <div className="w-28 p-2">
          {[['Sell', '3,001.20', 'text-down'], ['Buy', '3,001.40', 'text-up']].map(([k, v, c]) => (
            <div key={k} className={`mb-1 rounded ${k === 'Buy' ? 'bg-buy/15' : 'bg-sell/15'} px-2 py-1.5 text-center`}>
              <div className={`text-[9px] uppercase ${c}`}>{k}</div>
              <div className={`tnum font-mono text-[12px] ${c}`}>{v}</div>
            </div>
          ))}
          <div className="mt-2 space-y-1 text-[9px] text-text-faint">
            <div className="flex justify-between"><span>Margin</span><span className="tnum text-text-dim">$150.00</span></div>
            <div className="flex justify-between"><span>Pip value</span><span className="tnum text-text-dim">$1.00</span></div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 border-t border-border px-3 py-1.5 text-[10px] text-text-faint">
        <span>Equity <span className="tnum text-text-dim">$10,100.00</span></span>
        <span>Free <span className="tnum text-text-dim">$9,950.00</span></span>
        <span>Level <span className="tnum text-up">6733%</span></span>
      </div>
    </div>
  );
}
