import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell, SectionHeading } from '@/components/marketing/marketing-shell';
import { FundingSection } from '@/components/marketing/funding-section';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Funding — Aurum Markets',
  description: 'Deposit and withdraw with M-Pesa. Instant, no broker fee.',
};

const RAILS: { method: string; min: string; max: string; time: string; fee: string; status: 'live' | 'soon' }[] = [
  { method: 'M-Pesa', min: 'KES 100', max: 'KES 250,000 / txn', time: 'Instant', fee: 'No broker fee', status: 'live' },
  { method: 'Card (Visa / Mastercard)', min: '$10', max: '$10,000', time: 'Instant', fee: 'No broker fee', status: 'soon' },
  { method: 'Bank transfer', min: '$50', max: 'No limit', time: '1–2 business days', fee: 'No broker fee', status: 'soon' },
];

export default function FundingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading eyebrow="Funding" title="Deposit and withdraw with M-Pesa" subtitle="Fund your wallet in KES with an STK prompt to your phone, and withdraw back to the same M-Pesa number. Instant, transparent, no broker fee." />
        <div className="mt-12">
          <FundingSection />
        </div>

        <div className="mt-16">
          <h3 className="mb-4 font-display text-xl font-semibold text-text">Payment methods</h3>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] border-b border-border bg-surface-2 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
              <span>Method</span>
              <span>Min</span>
              <span>Max</span>
              <span>Time</span>
              <span>Fee</span>
            </div>
            {RAILS.map((r) => (
              <div key={r.method} className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] items-center border-b border-border/60 px-5 py-3.5 text-[13px] last:border-0">
                <span className="flex items-center gap-2 font-medium text-text">
                  {r.method}
                  {r.status === 'soon' ? <Badge tone="neutral">Soon</Badge> : <Badge tone="up">Live</Badge>}
                </span>
                <span className="tnum text-text-dim">{r.min}</span>
                <span className="tnum text-text-dim">{r.max}</span>
                <span className="text-text-dim">{r.time}</span>
                <span className="text-text-dim">{r.fee}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-text-faint">
            Withdrawals return to the same method used to deposit (return-to-source) and require a verified account.
            M-Pesa limits are set by Safaricom.
          </p>
        </div>

        <div className="mt-12 text-center">
          <Link href="/register">
            <Button size="lg">Open an account & fund with M-Pesa</Button>
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
