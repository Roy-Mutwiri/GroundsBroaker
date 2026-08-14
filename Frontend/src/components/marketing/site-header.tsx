import Link from 'next/link';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';

const NAV = [
  { label: 'Markets', href: '/instruments' },
  { label: 'Accounts', href: '/accounts' },
  { label: 'Funding', href: '/funding' },
];

export function SiteHeader() {
  return (
    <div className="sticky top-0 z-40">
      {/* Persistent risk strip (regulated-broker pattern). */}
      <div className="bg-surface-2 px-4 py-1.5 text-center text-[11px] leading-tight text-text-faint">
        Demo platform — no real money. Trading online forex/CFDs is high risk and can result in the loss of all invested capital.
      </div>
      <header className="border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/" aria-label="Aurum Markets home">
              <Wordmark />
            </Link>
            <nav className="hidden items-center gap-6 md:flex">
              {NAV.map((n) => (
                <Link key={n.label} href={n.href} className="text-[13px] text-text-dim transition-colors hover:text-text">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/trade/XAUUSD" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Trade
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Open account</Button>
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}
