import Link from 'next/link';
import { Wordmark } from '@/components/brand/wordmark';
import { Button } from '@/components/ui/button';

const NAV = [
  { label: 'Markets', href: '/#markets' },
  { label: 'Accounts', href: '/#accounts' },
  { label: 'Funding', href: '/#funding' },
  { label: 'Company', href: '/#company' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" aria-label="Aurum Markets home">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((n) => (
              <a key={n.label} href={n.href} className="text-[13px] text-text-dim transition-colors hover:text-text">
                {n.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
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
  );
}
