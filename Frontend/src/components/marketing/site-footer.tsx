import Link from 'next/link';
import { Wordmark } from '@/components/brand/wordmark';
import { RiskWarningBar } from './risk-warning-bar';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Markets',
    links: [
      { label: 'Gold & metals', href: '/instruments' },
      { label: 'Forex', href: '/instruments' },
      { label: 'Indices', href: '/instruments' },
      { label: 'Crypto', href: '/instruments' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Trading terminal', href: '/trade/XAUUSD' },
      { label: 'Account types', href: '/accounts' },
      { label: 'Funding & M-Pesa', href: '/funding' },
      { label: 'Open account', href: '/register' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: '/legal/terms' },
      { label: 'Privacy', href: '/legal/privacy' },
      { label: 'Risk disclosure', href: '/legal/risk-disclosure' },
      { label: 'AML policy', href: '/legal/aml' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-5">
        <div className="col-span-2">
          <Wordmark />
          <p className="mt-3 max-w-xs text-[13px] text-text-dim">
            The gold-first broker built for Kenya. Trade XAUUSD and global markets, fund with M-Pesa.
          </p>
          <p className="mt-4 text-[12px] text-text-faint">
            CMA licence: <span className="text-text-dim">pending — demo platform</span>
          </p>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-text-faint">{c.title}</h4>
            <ul className="space-y-2">
              {c.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-[13px] text-text-dim transition-colors hover:text-text">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <RiskWarningBar />
    </footer>
  );
}
