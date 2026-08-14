import { Wordmark } from '@/components/brand/wordmark';
import { RiskWarningBar } from './risk-warning-bar';

const COLUMNS = [
  { title: 'Markets', links: ['Gold & metals', 'Forex', 'Indices', 'Crypto'] },
  { title: 'Platform', links: ['Trading terminal', 'Accounts', 'Funding & M-Pesa', 'Spreads'] },
  { title: 'Company', links: ['About', 'Contact', 'Careers', 'Partners'] },
  { title: 'Legal', links: ['Terms', 'Privacy', 'Risk disclosure', 'AML policy'] },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-6">
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
                <li key={l}>
                  <span className="cursor-default text-[13px] text-text-dim hover:text-text">{l}</span>
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
