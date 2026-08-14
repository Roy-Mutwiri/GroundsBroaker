import type { Metadata } from 'next';
import { MarketingShell, SectionHeading } from '@/components/marketing/marketing-shell';
import { InstrumentsExplorer } from '@/components/marketing/instruments-explorer';

export const metadata: Metadata = {
  title: 'Instruments — Aurum Markets',
  description: 'Live spreads across gold, forex, indices and crypto.',
};

export default function InstrumentsPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-4 py-14">
        <SectionHeading eyebrow="Markets" title="Instruments & live spreads" subtitle="Trade 21 instruments across metals, forex, indices and crypto — all from one funded account, in KES or USD." />
        <div className="mt-10">
          <InstrumentsExplorer />
        </div>
      </section>
    </MarketingShell>
  );
}
