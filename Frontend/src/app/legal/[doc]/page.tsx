import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MarketingShell } from '@/components/marketing/marketing-shell';
import { Badge } from '@/components/ui/badge';
import { LEGAL_DOCS } from '@/lib/marketing-data';

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const { doc } = await params;
  const d = LEGAL_DOCS[doc];
  return { title: d ? `${d.title} — Aurum Markets` : 'Legal — Aurum Markets' };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = LEGAL_DOCS[doc];
  if (!d) notFound();

  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-4 py-16">
        <div className="mb-8 border-b border-border pb-6">
          <Badge tone="warn" className="mb-3">
            {d.updated}
          </Badge>
          <h1 className="font-display text-4xl font-semibold tracking-tight text-text">{d.title}</h1>
        </div>
        <div className="space-y-8">
          {d.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="mb-2 text-[15px] font-semibold text-text">{s.heading}</h2>
              <p className="text-[14px] leading-relaxed text-text-dim">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-12 border-t border-border pt-6 text-[12px] text-text-faint">
          This is a template drafted for a demonstration platform and must be reviewed by qualified counsel before any
          real-money operation, which would require CMA (Kenya) authorisation.
        </p>
      </article>
    </MarketingShell>
  );
}
