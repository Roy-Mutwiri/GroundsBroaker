import Link from 'next/link';
import { ShieldCheck, Smartphone, LineChart, Layers } from 'lucide-react';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { LiveGoldRail } from '@/components/marketing/live-gold-rail';
import { InstrumentTable } from '@/components/marketing/instrument-table';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  return (
    <div data-surface="marketing" className="min-h-screen">
      <SiteHeader />

      {/* Hero — signature Live Gold Rail, left-weighted headline (no gradient blob). */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
        <div>
          <Badge tone="gold" className="mb-5">
            Gold-first · Kenya
          </Badge>
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-text md:text-5xl">
            Trade gold the way <span className="text-gold">the desk does.</span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-text-dim">
            XAUUSD and global markets on a fast, honest terminal. Fund instantly with M-Pesa, keep your
            costs transparent, and practise risk-free in demo mode.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/register">
              <Button size="lg">Open demo account</Button>
            </Link>
            <Link href="/showcase">
              <Button size="lg" variant="secondary">
                View design system
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-[12px] text-text-faint">No deposit needed · $10,000 demo balance</p>
        </div>
        <div className="flex justify-center md:justify-end">
          <LiveGoldRail />
        </div>
      </section>

      {/* Live instruments */}
      <section id="markets" className="mx-auto max-w-6xl px-4">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-text">Live markets</h2>
            <p className="mt-1 text-[13px] text-text-dim">Streaming demo prices — spreads shown in points.</p>
          </div>
          <Badge tone="warn">Demo feed</Badge>
        </div>
        <Card>
          <CardBody className="p-0">
            <InstrumentTable />
          </CardBody>
        </Card>
      </section>

      {/* Trust / why */}
      <section id="funding" className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={<Smartphone size={18} />} title="M-Pesa deposits" body="Fund in KES with an STK prompt to your phone. Instant, no broker fee." />
          <Feature icon={<LineChart size={18} />} title="Gold-first terminal" body="A dense, dark terminal tuned for XAUUSD — real charts, real order tickets." />
          <Feature icon={<ShieldCheck size={18} />} title="Honest by design" body="Transparent spreads and swaps. Real risk warnings. Demo until licensed." />
          <Feature icon={<Layers size={18} />} title="One wallet, many markets" body="Forex, metals, indices and crypto from a single funded account." />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card>
      <CardBody>
        <div className="mb-3 grid h-9 w-9 place-items-center rounded border border-gold-dim bg-surface-2 text-gold">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-text-dim">{body}</p>
      </CardBody>
    </Card>
  );
}
