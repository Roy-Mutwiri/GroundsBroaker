import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import { MarketingShell, SectionHeading } from '@/components/marketing/marketing-shell';
import { AccountTypes } from '@/components/marketing/account-types';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Account types — Aurum Markets',
  description: 'Standard and Gold accounts, in KES or USD.',
};

const COMPARE: { feature: string; standard: string | boolean; gold: string | boolean }[] = [
  { feature: 'Minimum deposit', standard: '$0', gold: '$100' },
  { feature: 'Spread from', standard: '1.2 pips', gold: '0.0 pips' },
  { feature: 'Commission', standard: 'None', gold: '$3.50 / lot / side' },
  { feature: 'Max leverage', standard: '1:400', gold: '1:400' },
  { feature: 'KES-denominated', standard: true, gold: true },
  { feature: 'All 21 instruments', standard: true, gold: true },
  { feature: 'Priority execution', standard: false, gold: true },
  { feature: 'Full market depth', standard: false, gold: true },
];

export default function AccountsPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading center eyebrow="Accounts" title="Choose how you trade gold" subtitle="Start commission-free on Standard, or go raw on Gold for the tightest spreads. Switch anytime." />
        <div className="mt-10">
          <AccountTypes />
        </div>

        <div className="mt-16 overflow-hidden rounded-lg border border-border bg-surface">
          <div className="grid grid-cols-3 border-b border-border bg-surface-2 px-5 py-3 text-[12px] font-semibold uppercase tracking-wide text-text-faint">
            <span>Feature</span>
            <span className="text-center">Standard</span>
            <span className="text-center text-gold">Gold</span>
          </div>
          {COMPARE.map((r) => (
            <div key={r.feature} className="grid grid-cols-3 items-center border-b border-border/60 px-5 py-3 text-[13px] last:border-0">
              <span className="text-text-dim">{r.feature}</span>
              <span className="text-center">{cell(r.standard)}</span>
              <span className="text-center">{cell(r.gold)}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/register">
            <Button size="lg">Open a free demo account</Button>
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}

function cell(v: string | boolean) {
  if (v === true) return <Check size={16} className="mx-auto text-gold" />;
  if (v === false) return <Minus size={16} className="mx-auto text-text-faint" />;
  return <span className="tnum font-mono text-text">{v}</span>;
}
